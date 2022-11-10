let curTime;
let counter = [];
function test(){
    curTime = performance.now()
}
function testEnd(n){
    counter.push(performance.now() - curTime)
    if(counter.length === n){
        console.log(counter.reduce((acc,cv)=>acc+cv,0)/counter.length);
        counter = []
    }
}
class Grid {
    constructor(width,height){
        /**@type {Pixel[][]} */
        this.pixels = Array(width);
        /**@type {Pixel[][]} */
        this.pixels_next = Array(width)
        for(let i = 0; i < width; i++){
            this.pixels[i] = Array(height)
            this.pixels_next[i] = Array(height)
            for(let j = 0; j < height; j++) {
                this.pixels[i][j] = new Air(i,j)
                this.pixels_next[i][j] = new Air(i,j)
            }
        }
    }
    /**@param {Pixel} to */
    set(x,y,to){
        if(x >= 0 && x < this.width && y >= 0 && y < this.height){
            if(typeof to === 'string'){
                to = Pixel.fromString(to)
            }
            this.pixels_next[x][y] = to.at(x,y);
        }
        return this;
    }
    swap(x1,y1,x2,y2){
        // this.set(x2,y2,this.pixels[x1][y1])
        // this.set(x1,y1,this.pixels[x2][y2])
        //this.pixels_next[x2][y2] = this.pixels[x1][y1].at(x2,y2)
        //this.pixels_next[x1][y1] = this.pixels[x2][y2].at(x1,y1)
        let p1 = this.get(x1,y1)
        let p2 = this.get(x2,y2);
        this.set(x1,y1,p2);
        this.set(x2,y2,p1);
        return this;
    }
    get(x,y){
        if(x < 0 || x >= this.width || y < 0 || y >= this.height)
            return undefined;
        return this.pixels[x][y]
    }

    get width(){return this.pixels.length}
    get height(){return this.pixels[0].length}
    flip(){
        this.pixels = this.pixels_next;
        return this;
    }
    /**@param {CanvasRenderingContext2D} ctx */
    render(ctx){
        // test()
        for(let x = 0; x < this.width; x++) {
            for(let y = 0; y < this.height; y++){
                ctx.fillStyle = this.get(x,y).color
                ctx.fillRect(
                    Math.floor(x*Pixel.size),
                    Math.floor(y*Pixel.size),
                    Pixel.size,
                    Pixel.size
                )
            }
        }
        // testEnd(1000)
    }
    update(){
        // Bottom up
        for(let y = this.height - 1; y >= 0; y--){
            // Either left or right for less uniform
            if(Math.random() < 0.5) {
                for(let x = this.width-1; x >= 0; x--){
                    let p = this.get(x,y)
                    if(!p.is("air"))
                        p.move(this);
                    p.life++
                }
            } else {
                for(let x = 0; x < this.width; x++){
                    let p = this.get(x,y)
                    if(!p.is("air"))
                        p.move(this);
                    p.life++
                }
            }
        }
    }
    /**@param {function(Pixel):any} f */
    forEach(f){
        for(let x = 0; x < this.width; x++) {
            for(let y = 0; y < this.height; y++){
                f(this.get(x,y))
            }
        }
    }
    clear(){
        this.forEach(t=>this.set(t.x,t.y,'air'))
    }
}

class Pixel {
    static size = 4;
    /**@type {Map.<string,Pixel>} */
    static types = new Map();
    solid = false;
    liquid = false;
    gas = false;
    color = "#bbb"
    /**How many times the pixel moves when is updated */
    speed = 5;
    /**Determines the exact type of pixel */
    type = "NULL"
    /**Incremented every tick */
    life = 0;
    constructor(x=-1, y=-1){
        /**@type {number} */
        this.x = x;
        /**@type {number} */
        this.y = y;
    }
    /**Creates a full clone of this pixel */
    clone(){
        let n = new this.constructor(this.x,this.y);
        n.color = this.color;
        n.life = this.life;
        return n;
    }
    /**Creates a shallow copy of this pixel */
    copy(){
        return Pixel.fromString(this.type);
    }
    /**
     * @param {string} type
     * @param {Constructor} pixel
     * Used when defining a new type to allow tracking and placement 
     */
    static addType(type,pixel){
        Pixel.types.set(type,pixel);
        return type;
    }
    /**Gets the contstructor for a type and returns a new Pixel of that type */
    static fromString(str){
        return new (Pixel.types.get(str))()
    }
    visibleSides(grid){
        return {
            left:this.left(grid)?.color === this.color,
            right:this.right(grid)?.color === this.color,
            top:this.up(grid)?.color === this.color,
            bottom:this.down(grid)?.color === this.color
        }
    }
    /**@returns {Pixel?} */
    left (grid){ return grid.get(this.x-1, this.y)}
    /**@returns {Pixel?} */
    right(grid){ return grid.get(this.x+1, this.y)}
    /**@returns {Pixel?} */
    up   (grid){ return grid.get(this.x,   this.y-1)}
    /**@returns {Pixel?} */
    upL  (grid){ return grid.get(this.x-1, this.y-1)}
    /**@returns {Pixel?} */
    upR  (grid){ return grid.get(this.x+1, this.y-1)}
    /**@returns {Pixel?} */
    down (grid){ return grid.get(this.x,   this.y+1)}
    /**@returns {Pixel?} */
    downL(grid){ return grid.get(this.x-1, this.y+1)}
    /**@returns {Pixel?} */
    downR(grid){ return grid.get(this.x+1, this.y+1)}
    sides(grid){ return [this.up(grid),this.left(grid),this.right(grid),this.down(grid)]}
    allSides(grid){ return [this.up(grid),this.left(grid),this.right(grid),this.down(grid)]}
    /**
     * General purpose create new pixel from something
     * @returns {Pixel?}
     */
    static make(maker){
        try{
            if(typeof maker === 'string'){
                return Pixel.fromString(maker)
            }
            if (typeof maker === "function") {
                return new maker()
            } 
            if(typeof maker === 'object') {
                return new maker.constructor()
            }
        } catch(e){
            return undefined
        }
    }
    /**
     * @abstract
     * @param {Grid} grid 
     */
    move(grid){}
    /**Updates this pixels location and returns it */
    at(x,y){ this.x = x; this.y = y; return this; }
    /**@param {Grid} grid Swaps out this pixel for another*/
    replace(grid, other){
        grid?.set(this.x, this.y, other);
    }
    is(...types) { return types.some(t=>this.type===t); }
    /**@param {Grid} grid */
    moveSand(grid,c=this.speed){
        if(c <= 0){return }
        let d = this.down(grid)//grid.get(this.x,this.y + 1)
        if(d) {
            // if(d.is("air","water",'steam')) {
            if(d?.gas || d?.liquid){
                grid.set(this.x, this.y, new (d.constructor)())
                grid.set(this.x, this.y + 1, this); 
                // grid.swap(this.x,this.y,this.x,this.y+1)
                this.move(grid,c - 1)
            } else {
                // Check down left and down right
                let s = (Math.random() < 0.5)? 1 : -1;
                let checks = [[this.x - s,this.y+1],[this.x+s,this.y+1]]
                for(let i = 0; i < checks.length; i++) {
                    let nx = checks[i][0], ny = checks[i][1]
                    let t = grid.get(nx,ny)
                    if(t?.gas || t?.liquid){
                        //Swap
                    // if(t?.is("air","smoke","steam","water")) {
                        //grid.set(this.x,this.y,new (grid.get(nx,ny)).constructor())
                        //grid.set(nx, ny, this);
                        grid.swap(this.x,this.y,nx,ny)
                        return;
                    }
                }
            }
            
        }
    }
    
}

class Air extends Pixel {
    color='lightgrey'
    static type = Pixel.addType("air",Air);
    type = Air.type;
    gas = true;
    constructor(x,y){
        super(x,y)
    }
    move(grid,c){
        
    }
}

class MovableSolid extends Pixel {
    solid = true;
    constructor(x,y){
        super(x,y);
    }
}

class MovableGas extends Pixel {
    gas = true;
    constructor(x,y){
        super(x,y);
    }
    moveUp(grid, c=this.speed){
        if(c <= 0){return }
        let d = grid.get(this.x,this.y - 1)

        if(d) {
            if(d.is("air")) {
                grid.set(this.x, this.y,     new Air())
                grid.set(this.x, this.y - 1, this); 
                // grid.swap(this.x,this.y,this.x,this.y+1)
                this.move(grid,c - 1)
                return
            } else {
                // Check down left and down right
                let s = (Math.random() < 0.5)? 1 : -1;
                let checks = [
                    //Diags first
                    [this.x-s,this.y-1],
                    [this.x+s,this.y-1],
                    //Then sides
                    [this.x-s,this.y],
                    [this.x-s,this.y],
                ]
                for(let i = 0; i < checks.length; i++) {
                    let nx = checks[i][0], ny = checks[i][1]
                    if(grid.get(nx,ny)?.is("air")){
                        //Swap
                        grid.set(this.x,this.y,new (grid.get(nx,ny)).constructor())
                        grid.set(nx, ny, this);
                        return;
                    }
                }
            }
            
        }
    }
}

class MovableLiquid extends Pixel {
    liquid = true;
}

class Sand extends MovableSolid {
    color = (Math.random() < 0.5)?'beige':"#eceda8"
    static type = Pixel.addType("sand", Sand)
    type = Sand.type;
    /**@param {Grid} grid */
    move(grid, c = this.speed){
        this.moveSand(grid,c)
    }
}

class Gravel extends MovableSolid {
    color = (Math.random() < 0.5)?'grey':"darkgrey"
    static type = Pixel.addType("gravel", Gravel)
    type = Gravel.type;
    /**@param {Grid} grid */
    move(grid, c = this.speed){
        this.moveSand(grid,c)
    }
}

class Wood extends MovableSolid {
    color = (Math.random() < 0.5)?'#822300':"#66230a"
    static type = Pixel.addType("wood",Wood)
    type = Wood.type;
}

class Water extends MovableLiquid {
    color = (Math.random() < 0.5)? "#101cc9":"#1045c9"
    static type = Pixel.addType("water",Water)
    type = Water.type;

    move(grid,c=this.speed){
        if(c <= 0){return }
        let d = this.down(grid)//grid.get(this.x,this.y + 1)
        if(d) {
            if(d.gas) {
                grid.set(this.x, this.y,     new Air())
                grid.set(this.x, this.y + 1, this); 
                // grid.swap(this.x,this.y,this.x,this.y+1)
                this.move(grid,c - 1)
            } else {
                // Check down left and down right
                let s = (Math.random() < 0.5)? 1 : -1;
                let checks = [
                    //Diags first
                    [this.x - s,this.y+1],
                    [this.x+s,this.y+1],
                    //Then sides
                    [this.x-s,this.y],
                    [this.x-s,this.y],
                ]
                for(let i = 0; i < checks.length; i++) {
                    let nx = checks[i][0], ny = checks[i][1]
                    // if(grid.get(nx,ny)?.is("air",'steam')){
                    if(grid.get(nx,ny)?.gas) {
                        //Swap
                        grid.set(this.x,this.y,new (grid.get(nx,ny)).constructor())
                        grid.set(nx, ny, this);
                        return;
                    }
                }
                this.move(grid,c-2)
            }
            
        }
    }
}

class Fire extends MovableGas {
    color = (Math.random() < 0.6)?'red':(Math.random() < 0.6)?"orange":'yellow'
    static type = Pixel.addType('fire',Fire)
    type = Fire.type;
    speed = 1;
    move(grid, c=this.speed){
        if(c < 1) return;
        if(this.life >= 50){
            grid.set(this.x,this.y,'air')
        }
        if(this.up(grid)?.solid){
            grid.set(this.x,this.y,"air")
            return;
        }
        let checks = this.sides(grid)//[this.up(grid),this.left(grid),this.right(grid),this.down(grid)]
        for(let i = 0; i < checks.length;i++){
            // If next to any water, replace with steam
            if(checks[i]?.is("water")){
                this.replace(grid,"air")
                checks[i].replace(grid, "steam")
                return;
            }
            if(checks[i]?.is('wood') && Math.random() < 0.75){
                checks[i]?.replace(grid,'fire')
            }
        }
        this.moveUp(grid,c)
        if(Math.random() < 0.002){
            if(grid.get(this.x,this.y-1)?.is("air")){
                grid.set(this.x,this.y-1,'smoke')
            }
        }
        
    }
}

class Smoke extends MovableGas {
    color = '#3f3f3f'
    speed = 1;
    static type = Pixel.addType('smoke',Smoke)
    type = Smoke.type
    move(grid, c = this.speed){
        if(this.life > 2000) {
            grid.set(this.x,this.y,'air')
            return;
        }
        this.moveUp(grid,c)
    }
}

class Steam extends MovableGas {
    color = '#adadad'
    static type = Pixel.addType("steam",Steam)
    type = Steam.type
    move(grid,c=this.speed){
        if(this.life > 500 && Math.random() < 0.025) {
            grid.set(this.x,this.y,'water')    
            return;
        }
        this.moveUp(grid,c)
    }
}

//#region Setup

function drawMouse(ctx){
    // Draw mouse
    ctx.fillStyle = (mouse.down)?'red':'black';
    let tx = Math.floor(mouse.x / Pixel.size)
    let ty = Math.floor(mouse.y / Pixel.size)
    circlePoints(tx,ty,penSizeInput.value).forEach(p=>{
        ctx.fillRect(
            p[0]* Pixel.size,
            p[1]* Pixel.size,
            Pixel.size,
            Pixel.size
        )
    })  
}

function circlePoints(xCent,yCent,r){
    r = r - 1
    let ret = [];
    for(let x = xCent - r; x <= xCent; x++){
        for(let y = yCent - r; y <= yCent; y++){
            if((x - xCent)*(x - xCent) + (y - yCent)*(y - yCent) <= r*r) {
                let xSym = xCent - (x - xCent)
                let ySym = yCent - (y - yCent)

                //(x, y), (x, ySym), (xSym , y), (xSym, ySym)
                ret.push([x,y],[x,ySym],[xSym,y],[xSym,ySym])
            }
        }
    }
    return ret
}

function rectPoints(x,y,w,h){
    let ret = []
    for(let nx = x; nx < w; nx ++){
        for(let ny = y; ny < h; ny++){
            ret.push([nx,ny])
        }
    }
    return ret;
}

function setAll(grid,pts,to) {
    pts.forEach(p=>{
        grid.set(p[0],p[1],Pixel.make(to))
    })
}

/**Converts all of one type in the grid to another */
function changeAll(typeStr,toCons){
    grid.forEach(t=>{
        if(t.is(typeStr)){
            grid.set(t.x,t.y,Pixel.make(toCons))
        }
    })
}

/**@type {HTMLCanvasElement} */
let canvas = document.getElementById("canvas");
/**@type {CanvasRenderingContext2D} */ 
let ctx = canvas.getContext("2d", {alpha:false});

let mouse = {x:0,y:0,down:false}
let grid = new Grid(120, 120);
for(let x = 0; x < grid.width; x++) {
    for(let y = grid.height/2; y < grid.height; y++) {
        let t = (y > 3 * grid.height / 4)?new Sand():new Gravel()
        grid.set(x,y,t)
    }
}

for(let i = 0; i < 50; i++) {
    let x = randInt(grid.width)
    let y = randInt(grid.height/2,grid.height)
    setAll(grid,circlePoints(x,y,7),Air)
    setAll(grid,circlePoints(randInt(grid.width),y - grid.height/2,3),Water)
}

function randInt(from,to){
    if(from === undefined){
        return randInt(0,1)
    }
    if(to === undefined) {
        return randInt(0,from)
    }
    return Math.floor(Math.random() * (to-from)) + from
}


function tick(){
    if(mouse.down){
        let tx = Math.floor(mouse.x / Pixel.size),
            ty = Math.floor(mouse.y / Pixel.size)     
        setAll(grid,circlePoints(tx,ty,penSizeInput.value),clickType)        
    }
    grid.update()
    grid.render(ctx);
    drawMouse(ctx);
    grid.flip()
}

let tickInterval = setInterval(tick,1000/60)

canvas.addEventListener('mousedown',e=>{mouse.down = true})
document.addEventListener('mouseup',e=>{mouse.down = false})
canvas.addEventListener('mousemove',e=>{
    let r = canvas.getClientRects()[0]
    mouse.x = e.x - r.left;
    mouse.y = e.y - r.top
})

canvas.width = grid.width * Pixel.size;
canvas.height = grid.height * Pixel.size;
ctx.imageSmoothingEnabled = false;
let penSizeInput = document.getElementById("penSize")

let clickType = Sand

let buttonsE = document.getElementById('buttons')
document.getElementById("clear").addEventListener('click',e=>{
    if(confirm("Are you sure?")){
        grid.clear()
    }
})
Pixel.types.forEach((t,k)=>{
    let b = document.createElement("button")
    b.addEventListener('click',e=>{
        clickType = t;
    })
    b.textContent = k.charAt(0).toUpperCase()+k.slice(1);
    buttonsE.appendChild(b)
})

//#endregion Setup