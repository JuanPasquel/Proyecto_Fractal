 // Región original del plano complejo
 const originalMinA = -2.5, originalMaxA = 1, originalMinB = -1, originalMaxB = 1;
 // Centro actual y variables de la región a visualizar
 let centerX, centerY;
 let minA, maxA, minB, maxB;
 // Nivel de zoom (1 = sin zoom, >1: zoom in, <1: zoom out)
 let zoomLevel = 1;

 // Parámetro de iteraciones y caché de colores
 let maxIterations = 200;
 let colorFractal, cachedColors = [];
 let currentRow = 0;
 // Batch sizes: uno para la renderización normal y otro mayor para el modo preview al arrastrar
 const normalBatchSize = 10;
 const dragBatchSize = 40;
 let batchSize = normalBatchSize;

 // Elementos de la interfaz
 let iterationsSlider, iterationsSliderValue, iterationsInput, colorPicker, zoomSlider, zoomValue;

 // Variables para panning
 let dragging = false, panStartX = 0, panStartY = 0, centerXStart = 0, centerYStart = 0;

 function setup() {
   createCanvas(800, 600);
   pixelDensity(1);

   // Inicializar centro y calcular región inicial
   centerX = (originalMinA + originalMaxA) / 2;
   centerY = (originalMinB + originalMaxB) / 2;
   updateRegion();

   colorFractal = color('#ff0000');

   // Seleccionar elementos del DOM
   iterationsSlider = select('#iterationsSlider');
   iterationsSliderValue = select('#iterationsSliderValue');
   iterationsInput = select('#iterationsInput');
   colorPicker = select('#colorPicker');
   zoomSlider = select('#zoomSlider');
   zoomValue = select('#zoomValue');

   // Sincronizar controles de iteraciones (slider y numérico)
   iterationsSlider.input(() => {
     maxIterations = int(iterationsSlider.value());
     iterationsSliderValue.html(maxIterations);
     iterationsInput.value(maxIterations);
     updateParameters();
   });
   iterationsInput.input(() => {
     maxIterations = int(iterationsInput.value());
     iterationsSlider.value(maxIterations);
     iterationsSliderValue.html(maxIterations);
     updateParameters();
   });

   // Color del fractal
   colorPicker.input(updateParameters);

   // Zoom con slider
   zoomSlider.input(() => {
     zoomLevel = parseFloat(zoomSlider.value());
     zoomValue.html(zoomLevel + "x");
     updateRegion();
     currentRow = 0;
     loadPixels();
     loop();
   });

   buildColorCache();
   loadPixels();
   noStroke();
   frameRate(60);
 }

 // Calcula la región actual según el centro y el zoomLevel
 function updateRegion() {
   let regionWidth = (originalMaxA - originalMinA) / zoomLevel;
   let regionHeight = (originalMaxB - originalMinB) / zoomLevel;
   minA = centerX - regionWidth / 2;
   maxA = centerX + regionWidth / 2;
   minB = centerY - regionHeight / 2;
   maxB = centerY + regionHeight / 2;
 }

 // Actualiza parámetros (iteraciones, color) y reinicia el dibujo
 function updateParameters() {
   maxIterations = int(iterationsInput.value());
   colorFractal = color(colorPicker.value());
   buildColorCache();
   currentRow = 0;
   loadPixels();
   loop();
 }

 // Precalcula la caché de colores para cada iteración
 function buildColorCache() {
   cachedColors = [];
   let r = red(colorFractal);
   let g = green(colorFractal);
   let b = blue(colorFractal);
   for (let i = 0; i < maxIterations; i++) {
     let bright = i / maxIterations;
     cachedColors[i] = [r * bright, g * bright, b * bright, 255];
   }
 }

 function draw() {
   // Procesamiento por lotes para mantener la interfaz responsiva
   for (let y = currentRow; y < currentRow + batchSize && y < height; y++) {
     for (let x = 0; x < width; x++) {
       // Mapear coordenadas del píxel al plano complejo usando la región actual
       let a0 = map(x, 0, width, minA, maxA);
       let b0 = map(y, 0, height, minB, maxB);
       let a = a0, b = b0, n = 0;

       while (n < maxIterations) {
         let aa = a * a - b * b;
         let bb = 2 * a * b;
         a = aa + a0;
         b = bb + b0;
         if (a * a + b * b > 16) break;
         n++;
       }

       let index = (x + y * width) * 4;
       if (n === maxIterations) {
         pixels[index] = 0;
         pixels[index + 1] = 0;
         pixels[index + 2] = 0;
         pixels[index + 3] = 255;
       } else {
         let col = cachedColors[n];
         pixels[index] = col[0];
         pixels[index + 1] = col[1];
         pixels[index + 2] = col[2];
         pixels[index + 3] = col[3];
       }
     }
   }
   updatePixels();
   currentRow += batchSize;
   if (currentRow >= height) noLoop();
 }

 // Zoom con la rueda del mouse (sincroniza el slider)
 function mouseWheel(event) {
   let mouseRe = map(mouseX, 0, width, minA, maxA);
   let mouseIm = map(mouseY, 0, height, minB, maxB);
   let zoomFactor = event.delta > 0 ? 1.1 : 0.9;

   minA = lerp(mouseRe, minA, zoomFactor);
   maxA = lerp(mouseRe, maxA, zoomFactor);
   minB = lerp(mouseIm, minB, zoomFactor);
   maxB = lerp(mouseIm, maxB, zoomFactor);

   centerX = (minA + maxA) / 2;
   centerY = (minB + maxB) / 2;
   let regionWidth = maxA - minA;
   zoomLevel = (originalMaxA - originalMinA) / regionWidth;
   zoomSlider.value(zoomLevel);
   zoomValue.html(zoomLevel + "x");

   currentRow = 0;
   loadPixels();
   loop();
   return false;
 }

 // Panning: al presionar se activa el modo de arrastre y se aumenta el batch para un preview rápido
 function mousePressed() {
   if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
     dragging = true;
     batchSize = dragBatchSize;
     panStartX = mouseX;
     panStartY = mouseY;
     centerXStart = centerX;
     centerYStart = centerY;
   }
 }

 // Actualiza el centro según el arrastre y renderiza el preview rápidamente
 function mouseDragged() {
   if (dragging) {
     let regionWidth = (originalMaxA - originalMinA) / zoomLevel;
     let regionHeight = (originalMaxB - originalMinB) / zoomLevel;
     centerX = centerXStart + (mouseX - panStartX) * (regionWidth / width);
     centerY = centerYStart + (mouseY - panStartY) * (regionHeight / height);
     updateRegion();
     currentRow = 0;
     loadPixels();
     loop();
   }
 }

 // Al soltar el mouse se restaura el batch normal y se re-renderiza en alta calidad
 function mouseReleased() {
   dragging = false;
   batchSize = normalBatchSize;
   updateParameters();
 }