function init(): void {
    // Download buttons
    for (const button of document.querySelectorAll('.download')) {
        button.addEventListener('click', function (event) {
            const canvas = button.previousElementSibling as HTMLCanvasElement;
            const url = canvas.toDataURL();
            window.open(url, '_blank');
        });
    }
    // Rotations input
    document.getElementById('input-rotations').addEventListener('change', function (event) {
        if(currentImg != null)
            handleImage(currentImg);
    });
}

var currentImg: HTMLImageElement = null;

function drawSpiral(canvas: HTMLCanvasElement, sampler: (x: number, y: number) => number, rotations: number, stepsPerRotation: number, fill: boolean): void {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Use coordinates in [-1, 1] x [-1, 1]    
    const steps = stepsPerRotation * rotations;
    const dangle = 2.0 * Math.PI / stepsPerRotation;
    const wMin = 0.0;
    const wMax = 0.85 / rotations / 2.0;
    const radiusMax = 1.0 - 2.0 * wMax;
    const dradius = - radiusMax / steps;

    // Get samples
    const samples = Array(steps);
    let sampleMin = 1.0;
    let sampleMax = 0.0;
    for (let i = 0; i <= steps; ++i) {
        const angle = i * dangle;
        const radius = radiusMax + dradius * i;
        const sample = sampler(radius * Math.cos(angle), radius * Math.sin(angle));;
        samples[i] = sample;
        sampleMin = Math.min(sampleMin, sample);
        sampleMax = Math.max(sampleMax, sample);
    }

    // Normalize samples
    if (sampleMin != sampleMax) {
        for (let i = 0; i <= steps; ++i) {
            samples[i] = (samples[i] - sampleMin) / (sampleMax - sampleMin);
        }
    }

    // Compute positions
    const x1s = Array(steps);
    const y1s = Array(steps);
    const x2s = Array(steps);
    const y2s = Array(steps);
    for (let i = 0; i <= steps; ++i) {
        const angle = i * dangle;
        const radius = radiusMax + dradius * i;
        const w = Math.min(radius, wMin + (wMax - wMin) * (1.0 - samples[i]));
        x1s[i] = (radius - w) * Math.cos(angle);
        y1s[i] = (radius - w) * Math.sin(angle);
        x2s[i] = (radius + w) * Math.cos(angle);
        y2s[i] = (radius + w) * Math.sin(angle);
    }

    // Draw lines
    for (let i = 0; i < steps; ++i) {
        ctx.beginPath();
        ctx.moveTo((1.0 + x1s[i]) * width / 2.0, (1.0 + y1s[i]) * height / 2.0);
        ctx.lineTo((1.0 + x1s[i + 1]) * width / 2.0, (1.0 + y1s[i + 1]) * height / 2.0);
        ctx.moveTo((1.0 + x2s[i]) * width / 2.0, (1.0 + y2s[i]) * height / 2.0);
        ctx.lineTo((1.0 + x2s[i + 1]) * width / 2.0, (1.0 + y2s[i + 1]) * height / 2.0);
        ctx.stroke();
    }

    // Fill interior
    if (fill) {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.moveTo((1.0 + x1s[0]) * width / 2.0, (1.0 + y1s[0]) * height / 2.0);
        for (let i = 0; i <= steps; ++i)
            ctx.lineTo((1.0 + x1s[i]) * width / 2.0, (1.0 + y1s[i]) * height / 2.0);
        for (let i = steps; i >= 0; --i)
            ctx.lineTo((1.0 + x2s[i]) * width / 2.0, (1.0 + y2s[i]) * height / 2.0);
        ctx.closePath();
        ctx.fill();
    }
}

const sampleSize = 1024;

function samplerOfImage(img: HTMLImageElement): (x: number, y: number) => number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const minSize = Math.min(img.width, img.height);
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    ctx.drawImage(img, sampleSize * (0.5 - img.width / minSize / 2.0), sampleSize * (0.5 - img.height / minSize / 2.0), img.width / minSize * sampleSize, img.height / minSize * sampleSize);
    return function (x: number, y: number): number {
        const rgba = ctx.getImageData(sampleSize * (0.5 + 0.5 * x), sampleSize * (0.5 + 0.5 * y), 1, 1).data;
        return (rgba[0] + rgba[1] + rgba[2]) / 3.0 / 255.0;
    }
}

window.onload = init;

function dragOverHandler(event: DragEvent): void {
    event.preventDefault();
}

function dropHandler(event: DragEvent) {
    event.preventDefault();
    // Get file
    let file = null;
    if (event.dataTransfer.items) {
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
            if (event.dataTransfer.items[i].kind === 'file') {
                file = event.dataTransfer.items[i].getAsFile();
                break;
            }
        }
    } else {
        for (let i = 0; i < event.dataTransfer.files.length; i++) {
            file = event.dataTransfer.files[i];
            break;
        }
    }

    // If no file, stop
    if (file == null)
        return;

    // Convert file to img
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = function () {
        // Create img
        const img = document.createElement('img');
        img.onload = function () {
            currentImg = img;
            handleImage(img);
        }
        img.src = reader.result as string;
    }
}

function handleImage(img: HTMLImageElement): void {
    // Create sampler
    const sampler = samplerOfImage(img);
    // Set parameters
    const rotations = Math.min(100, Math.max(5, parseFloat((document.getElementById('input-rotations') as HTMLInputElement).value)));
    const stepsPerRotation = 256;
    // Draw spirals
    drawSpiral(document.getElementById('canvas-puzzle') as HTMLCanvasElement, sampler, rotations, stepsPerRotation, false);
    drawSpiral(document.getElementById('canvas-solution') as HTMLCanvasElement, sampler, rotations, stepsPerRotation, true);
    // Show download buttons
    for (const button of document.querySelectorAll('.download'))
        (button as HTMLElement).style.display = null;
}
