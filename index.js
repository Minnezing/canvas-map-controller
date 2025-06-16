const canvas = document.querySelector(`canvas`);
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let dragPosition = { x: 0, y: 0 };
let scale = 1;

const CELL_SIZE = 30;

let isDragging = false;
let startDraggPosition = false;
let startDraggingPosition = false;

let scene = [];
let map = []

let scaleBox = document.querySelector(`#scale`);
let coordsBox = document.querySelector(`#coords`);

drawScene();
// renderMap();

function drawScene() {
    coordsBox.innerHTML = "(" + dragPosition.x + ", " + dragPosition.y + ")"
    scaleBox.innerHTML = (scale * 100).toFixed(0) + "%";
    drawGrid();

    scene.forEach(block => {
        ctx.save();
        ctx.fillStyle = block.color.main;
        ctx.fillRect(getX(block.x), getY(block.y), CELL_SIZE * scale, CELL_SIZE * scale);

        ctx.strokeStyle = block.color.border;
        ctx.beginPath();
        if (!scene.find(obj => obj.x === block.x + CELL_SIZE && obj.y === block.y && obj.color.main == block.color.main)) {
            ctx.moveTo(getX(block.x) + CELL_SIZE * scale, getY(block.y));
            ctx.lineTo(getX(block.x) + CELL_SIZE * scale, getY(block.y) + CELL_SIZE * scale);
        }
        
        if (!scene.find(obj => obj.x === block.x - CELL_SIZE && obj.y === block.y && obj.color.main == block.color.main)) {
            ctx.moveTo(getX(block.x), getY(block.y));
            ctx.lineTo(getX(block.x), getY(block.y) + CELL_SIZE * scale);
        }
        
        if (!scene.find(obj => obj.y === block.y + CELL_SIZE && obj.x === block.x && obj.color.main == block.color.main)) {
            ctx.moveTo(getX(block.x), getY(block.y) + CELL_SIZE * scale);
            ctx.lineTo(getX(block.x) + CELL_SIZE * scale, getY(block.y) + CELL_SIZE * scale);
        }
        
        if (!scene.find(obj => obj.y === block.y - CELL_SIZE && obj.x === block.x && obj.color.main == block.color.main)) {
            ctx.moveTo(getX(block.x), getY(block.y));
            ctx.lineTo(getX(block.x) + CELL_SIZE * scale, getY(block.y));
        }
        ctx.stroke();

        ctx.restore();
    })
}

function renderMap() {
    for (let x = (0 - dragPosition.x); x <= Math.abs(dragPosition.x) + canvas.width / scale; x += CELL_SIZE * scale) {
        for (let y = (0 - dragPosition.y); y <= Math.abs(dragPosition.y) + canvas.height / scale; y += CELL_SIZE * scale) {
            if (map.find(block => block.x === x && block.y === y)) return;
            let height = perlin.get(x / CELL_SIZE / 10, y / CELL_SIZE / 10);
            let type = "";
            if (height < -0.4) type = "water";
            if (height >= -0.4 && height <= 0) type = "lowlands";
            if (height > 0 && height <= 0.5) type = "surface";
            if (height > 0.5) type = "hill";
            drawBlock(x, y, type);
        }
    }
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    for (let x = scale * (dragPosition.x - CELL_SIZE * Math.floor(dragPosition.x / CELL_SIZE)); x < canvas.width; x += CELL_SIZE * scale) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = scale * (dragPosition.y - CELL_SIZE * Math.floor(dragPosition.y / CELL_SIZE)); y < canvas.height; y += CELL_SIZE * scale) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.strokeStyle = "#eee";
    ctx.stroke();
}

function drawBlock(x, y, type) {
    const blocks = {
        "water": {
            main: "blue",
            border: "darkblue"
        },
        "lowlands": {
            main: "darkgreen",
            border: "darkgreen"
        },
        "surface": {
            main: "green",
            border: "darkgreen"
        },
        "hill": {
            main: "lightgreen",
            border: "darkgreen"
        },
    }

    if (scene.find(e => e.x === x && e.y === y && e.color === blocks[type])) return;
    scene.push({ x, y, color: blocks[type] });
    drawScene();
}

document.addEventListener("click", (e) => {
    if (e.target.id === "game") 
        drawBlock(
            findClosestNumberDivisibleByK((e.clientX / scale) - dragPosition.x - (CELL_SIZE / 2 * scale), CELL_SIZE),
            findClosestNumberDivisibleByK((e.clientY / scale) - dragPosition.y - (CELL_SIZE / 2 * scale), CELL_SIZE),
            "water"
        );
})

document.addEventListener("mousedown", (e) => {
    if (e.button === 1) {
        document.querySelector("body").style.cursor = "grabbing";
        isDragging = true;
    }
})

document.addEventListener("mouseup", (e) => {
    if (e.button === 1) {
        document.querySelector("body").style.cursor = "auto";
        isDragging = false;
        startDraggingPosition = false;
        startDraggPosition = false;
    }
})


scaleBox.addEventListener(`click`, (e) => {
    scale = 1;
    drawScene();
})

coordsBox.addEventListener(`click`, (e) => {
    dragPosition.x = 0;
    dragPosition.y = 0;
    drawScene();
})

document.addEventListener("mousemove", (e) => {
    if (isDragging) {
        if (!startDraggingPosition) startDraggingPosition = { x: e.clientX, y: e.clientY };
        if (!startDraggPosition) startDraggPosition = { ...dragPosition };
        dragPosition.x = Math.floor(startDraggPosition.x + (e.clientX - startDraggingPosition.x) / scale);
        dragPosition.y = Math.floor(startDraggPosition.y + (e.clientY - startDraggingPosition.y) / scale);

        drawScene();
    }
})

document.addEventListener("wheel", (e) => {
    if (e.deltaY < 0) {
        if (scale >= 3) return;
        scale += 0.1;
    } else if (e.deltaY > 0) {
        if (scale <= 0.21) return;
        scale -= 0.1;
    }

    drawScene();
})

function getX(coord) {
    return (coord * scale) + (dragPosition.x * scale);
}

function getY(coord) {
    return (coord * scale) + (dragPosition.y * scale);
}

function findClosestNumberDivisibleByK(num, k) {
    // Находим остаток от деления num на k
    const remainder = num % k;

    // Если остаток равен 0, то num уже делится нацело на k
    if (remainder === 0) {
        return num;
    }

    // Находим наименьшее число, нацело делящееся на k, меньшее или равное num
    const closestSmallerNumber = num - remainder;

    // Находим наименьшее число, нацело делящееся на k, большее или равное num
    const closestLargerNumber = closestSmallerNumber + k;

    // Находим разницу между num и обоими найденными числами
    const diffSmaller = num - closestSmallerNumber;
    const diffLarger = closestLargerNumber - num;

    // Возвращаем число с наименьшей разницей
    if (diffSmaller <= diffLarger) {
        return closestSmallerNumber;
    } else {
        return closestLargerNumber;
    }
}