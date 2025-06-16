const screen = document.querySelector("#screen");
const { width, height }  = document.body.getBoundingClientRect()
screen.height = height
screen.width = width 

const controller = new CanvasController(screen);

let assets = [
    { id: "rect1", url: "test.svg" },
    { id: "rect2", url: "test 2.svg" },
]

controller.assets.loadAssets(assets).then(() => {
    controller.getLayer("default").addObject("rect1", 100, 100)
    controller.render()
})