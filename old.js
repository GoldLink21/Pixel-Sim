/**@type {HTMLCanvasElement} */
let canvas = document.getElementById("canvas");
/**@type {CanvasRenderingContext2D} */ 
let ctx = canvas.getContext("2d");

let mouse = {x:0,y:0,down:false}

var pSize = 3;

canvas.addEventListener('mousedown',e=>{mouse.down = true})
canvas.addEventListener('mouseup',e=>{mouse.down = false})
canvas.addEventListener('mousemove',e=>{
    let r = canvas.getClientRects()[0]
    mouse.x = e.x - r.left;
    mouse.y = e.y - r.top
})

const W = 150;
const H = 150;

/**@type {string[][]} */
var grid = ngrid(W,H,()=>"no")
var _next_grid = grid.map(e=>e.slice());

canvas.width = grid.length * pSize
canvas.height = grid[0].length * pSize

/**
 * 
 * @param {number} w 
 * @param {number} h 
 * @param {()=>any} init 
 */
function ngrid(w,h,init){
    let ret = Array(w);
    for(let i = 0; i < w; i++){
        ret[i] = Array(h).fill(init).map(e=>e())
    }
    return ret;
}

const pTypes = {
    //Nothing
    no:"no",
    sand:"sand",
    silt:"silt",
    wood:"wood",
    water:"water",
}
Object.freeze(pTypes);

/**
 * @param {number} x 
 * @param {number} y 
 * @param {number} dx 
 * @param {number} dy 
 * @returns {[number,number,string]}
 */
function moveBounded(x,y,dx,dy) {
    let rx = x + dx, ry = y + dy;
    if(x + dx < 0){
        rx = 0;
    }
    if(y + dy < 0){
        ry = 0
    }
    if(x + dx >= grid.length){
        rx = grid.length - 1
    }
    if(y + dy >= grid[0].length){
        ry = grid[0].length - 1;
    }
    return [rx,ry,grid[rx][ry]]
}

function sandFall(x,y, throughWater = true){
    let spd = 6;
    for(let i = 1; i < spd; i++){
        // Bottom
        if(y + i === grid[0].length){
            return [x,y+i-1]
        }
        let nt = grid[x][y+i]
        // Hit something
        if(nt !== pTypes.no && (throughWater && nt !== pTypes.water)) {
            return [x,y+i-1]
        }
    }
    // Hit nothing
    return [x,y+spd-1]
}

let atBottom = (x,y) => y === grid[0].length - 1
let atLeft   = (x,y) => x === 0
let atTop    = (x,y) => y === 0
let atRight  = (x,y) => x === grid.length - 1

/**@type {Map.<string,(x:number,y:number)=>void>} */
const pFuncs = new Map()

function fallType(x,y,type){
    let [nx,ny] = sandFall(x,y)
    let t = grid[nx][ny]

    if(t === pTypes.no || t === pTypes.water) {
       _next_grid[x][y] = t
       _next_grid[nx][ny] = type
       return;
    } 
    // Check left/right 
    let c1 = (Math.random() < 0.5) ? 1 : -1;
    let c2 = -c1;
    [nx, ny, t] = moveBounded(x,y,c1,1)
    if((t === pTypes.no || t == pTypes.water)  && y !== ny ) {
        _next_grid[x][y] = t
        _next_grid[nx][ny] = type
        return;
    }
    // Check other side
    [nx, ny, t] = moveBounded(x,y,c2,1)
    if((t === pTypes.no || t === pTypes.water) && y !== ny) {
        _next_grid[x][y] = t
        _next_grid[nx][ny] = type
    } else {
        _next_grid[x][y] = type
    }
}

pFuncs.set(pTypes.no,(x,y)=>{_next_grid[x][y]=pTypes.no});
pFuncs.set(pTypes.sand,(x,y)=>{
    fallType(x,y,pTypes.sand)
})
pFuncs.set(pTypes.silt,(x,y)=>{
    fallType(x,y,pTypes.silt)
})
pFuncs.set(pTypes.wood,(x,y)=>_next_grid[x][y]=pTypes.wood);
pFuncs.set(pTypes.water,(x,y)=>{
    let [nx,ny] = sandFall(x,y)
    let t = grid[nx][ny]

    if(t === pTypes.no) {
       _next_grid[x][y] = pTypes.no
       _next_grid[nx][ny] = pTypes.water
       return;
    } 
    // Check down left/right 
    let c1 = (Math.random() < 0.5) ? 1 : -1;
    let c2 = -c1;
    [nx, ny, t] = moveBounded(x,y,c1,1)
    if(t === pTypes.no && y !== ny ) {
        _next_grid[x][y] = pTypes.no
        _next_grid[nx][ny] = pTypes.water
        return;
    }
    // Check other side
    [nx, ny, t] = moveBounded(x,y,c2,1)
    if(t === pTypes.no && y !== ny) {
        _next_grid[x][y] = pTypes.no
        _next_grid[nx][ny] = pTypes.water
        return;
    }
    // Check one side
    [nx, ny, t] = moveBounded(x,y,c1,0)
    if(t === pTypes.no) {
        _next_grid[x][y] = pTypes.no
        _next_grid[nx][ny] = pTypes.water
        return;
    }
    [nx, ny, t] = moveBounded(x,y,c2,0)
    if(t === pTypes.no) {
        _next_grid[x][y] = pTypes.no
        _next_grid[nx][ny] = pTypes.water
        return;
    }
    // No move
    _next_grid[x][y] = pTypes.water
})
/**@type {Map.<string,string>} */
let pColors = new Map()
pColors.set(pTypes.no, "#b1b1b1")
pColors.set(pTypes.sand, "beige")
pColors.set(pTypes.silt, "grey")
pColors.set(pTypes.wood, "brown")
pColors.set(pTypes.water, "blue")

/**@type {Map.<string,number>} */
let pDensity = new Map()
pDensity.set(pTypes.no,0)
pDensity.set(pTypes.sand,1)
pDensity.set(pTypes.silt,2)
pDensity.set(pTypes.wood,99)
pDensity.set(pTypes.water,1)

function tick() {
    if(mouse.down) {
        let x = Math.floor(mouse.x/pSize)
        let y = Math.floor(mouse.y/pSize)
        if(grid[x][y] === pTypes.no || clickType === pTypes.no){
            grid[x][y] = clickType
            
            if(x + 1 < grid.length){
                grid[x+1][y] = clickType
                if(y + 1 < grid[x].length && clickType === pTypes.water)
                    grid[x+1][y+1] = clickType

            }
            if(y + 1 < grid[x].length && clickType === pTypes.water)
                grid[x][y+1] = clickType
        }
    }
    if(Math.random() < 0.5) {
        for(let x = 0; x < grid.length; x++){
        //Bottom up
            for(let y = grid[x].length - 1; y >=0; y--){
                (pFuncs.get(grid[x][y]))(x,y)
            }    
        }
    } else {
        for(let x = grid.length - 1; x >= 0; x--){
        //Bottom up
            for(let y = grid[x].length - 1; y >=0; y--){
                (pFuncs.get(grid[x][y]))(x,y)
            }    
        } 
    }
    // May need to do that later
    grid = _next_grid//.map(e=>e.slice())
}

let tickInterval;
setTimeout(()=>{
    tickInterval = setInterval(tick,1000/60)
},500) 

function renderPixels(){
    for(let x = 0; x < grid.length; x++) {
        for(let y = 0; y < grid[x].length; y++){
            ctx.fillStyle = pColors.get(grid[x][y])
            ctx.fillRect(x*pSize,y*pSize,pSize,pSize)
        }
    }
    ctx.fillStyle = (mouse.down)?'red':'black';
    ctx.fillRect(mouse.x,mouse.y,2*pSize,pSize)
}

function animate(){
    renderPixels()
    requestAnimationFrame(animate)
}
animate()

var clickType = pTypes.sand

let buttonsE = document.getElementById('buttons')
for(let key in pTypes) {
    let b = document.createElement("button")
    b.addEventListener('click',e=>{
        clickType = pTypes[key];
    })
    b.textContent = pTypes[key]
    buttonsE.appendChild(b)
}