
$(document).ready(function(){
    updateColors();
    create();

    $('#button-step').click(function(){
        step();
        paint();
    });

    $('#button-interpolation').click(function(){
        paint();
    });
    $('#button-auto').click(function(){
        autoStep();
    });
    autoStep();

    $('#func-color, #func-generation, #func-global').change(function(){
        updateFunctions();
        updateColors();
    });
    updateFunctions();

    $('#width, #height').change(function(){
        create();
    });

    $('#button-clear').click(function(){
        create();
    });

    $('#button-random').click(function(){
        randomize();
    });

    $('#button-export').click(function(){
        var js = save();

        $('#permalink').attr('href', location.protocol+'//'+location.host+location.pathname+(location.search?location.search:"") + '#' +js);
        $('#permalink').show();

        prompt("Export code", js);
    });

    $('#button-import').click(function(){
        var res = prompt("Paste code here", "");
        if(! res) return;

        load(res);
        create();
    });

    if(location.hash){
        var js = location.hash.substr(1);

        load(js);
        create();
    }

});

var width = 100;
var height = 100;
var maxx;
var maxy;
var tileSize = 5;

var field;
var auto = false;

var canvas;

var exportFields=[
    'width',
    'height',
    'randomize-age-a',
    'randomize-age-b',
    'auto-period',
    'age-paint',
    'age-erase',
    'func-generation',
    'func-color',
    'func-global',
];

function save(){
    var obj = {};

    exportFields.forEach(function(a){
        obj[a] = $('#'+a).val();
    });

    return encodeURIComponent(JSON.stringify(obj));
}

function load(js){
    var obj = JSON.parse(decodeURIComponent(js));

    console.log(obj);

    exportFields.forEach(function(a){
        if(obj[a] !== undefined){
            $('#'+a).val(obj[a]);
        }
    });

    return obj;
}



function paintAge(){
    return $('#age-paint').val()|0;
}

function eraseAge(){
    return $('#age-erase').val()|0;
}

function makeArray(size){
    return Array.apply(0, Array(size)).map(function () { return -1000 });
}

function create(){
    $('#canvas').empty();

    width = $('#width').val()|0 || 100;
    height = $('#height').val()|0 || 100;

    maxx = width-1;
    maxy = width-1;

    canvas = document.createElement('canvas');
    canvas.id = "CursorLayer";
    canvas.width = width * tileSize;
    canvas.height = height * tileSize;
    $('#canvas').append(canvas);

    field = makeArray(width * height);

    var coords = function(event){
        var px = event.layerX - canvas.offsetLeft,
            py = event.layerY - canvas.offsetTop;

        var x = Math.floor(px / tileSize);
        var y = Math.floor(py / tileSize);

        var res = x + y * width;

        if(res < 0) return -1;
        if(res >= field.length) return -1;

        return res;
    };

    var painting;
    var erasing;
    var clicked = function(coord){
        if(painting) field[coord] = paintAge();
        if(erasing) field[coord] = eraseAge();

    };

    canvas.addEventListener('mousedown', function(event) {
        var coord = coords(event);
        if(coord == -1) return;

        var shouldPaint = field[coord] == paintAge() ? 0 : 1;
        painting = shouldPaint;
        erasing = ! shouldPaint;

        clicked(coord);
        paint();
    }, false);

    var drawLine = function (x0, y0, x1, y1) {

        var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        var dy = Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        var err = (dx>dy ? dx : -dy)/2;

        while (true) {
            clicked(x0 + y0 * width);
            if (x0 === x1 && y0 === y1) break;
            var e2 = err;
            if (e2 > -dx) { err -= dy; x0 += sx; }
            if (e2 < dy) { err += dx; y0 += sy; }
        }
    }

    var prevX=-1, prevY=-1;
    canvas.addEventListener('mousemove', function(event) {
        if(! painting && !erasing) return;

        var coord = coords(event);
        if(coord == -1) return;

        var x = coord % width;
        var y = Math.floor(coord / width)

        if(prevX!=-1){
            drawLine(prevX, prevY, x, y);
        } else{
            clicked(coord);
        }

        paint();

        prevX = x;
        prevY = y;

    }, false);

    canvas.addEventListener('mouseup', function(event) {
        var coord = coords(event);
        if(coord == -1) return;

        painting = 0;
        erasing = 0;

        prevX = -1;
        prevY = -1;
    }, false);

    updateFunctions();
    updateColors();

    paint();
}

function get(x,y){
    if(x>0 && x<maxx && y>0 && y<maxy) return field[x + y * width];

    if(x < 0) x+=width;
    if(y < 0) y+=height;
    if(x >= width) x-=width;
    if(y >= height) y-=height;

    if(x < 0) return 0;
    if(y < 0) return 0;
    if(x >= width) return 0;
    if(y >= height) return 0;

    return field[x + y * width];
}

function neighbours(x, y){
    var count = 0;

    for(var dx = -1; dx<2; dx++){
        for(var dy = -1; dy<2; dy++){
            if(dx==0 && dy==0) continue;

            count+= get(x+dx, y+dy)>0;
        }
    }

    return count;
}

function neighboursUnchecked(x, y){
    var count = 0;

    count += field[(x-1) + (y-1) * width]>0 ? 1 : 0;
    count += field[(x-1) + (y+0) * width]>0 ? 1 : 0;
    count += field[(x-1) + (y+1) * width]>0 ? 1 : 0;
    count += field[(x+0) + (y-1) * width]>0 ? 1 : 0;
    count += field[(x+0) + (y+1) * width]>0 ? 1 : 0;
    count += field[(x+1) + (y-1) * width]>0 ? 1 : 0;
    count += field[(x+1) + (y+0) * width]>0 ? 1 : 0;
    count += field[(x+1) + (y+1) * width]>0 ? 1 : 0;

    return count;
}
function updateFunc(elem, args){
    var errorElem = elem.parent().find(".error-message");

    try {
        var res = eval('var v = function('+args+') { ' + elem.val() + ' }; v');

        elem.removeClass("badcode");
        errorElem.hide();

        return res;
    } catch(e){
        elem.addClass("badcode");
        errorElem.text("line "+e.lineNumber +": " + e.message);
        errorElem.show();
        console.log(e);
        return null;
    }
}

function updateFunctions(){
    generationFunc = updateFunc($('#func-generation'), "x, y, n, age");
    colorFunc = updateFunc($('#func-color'), "age");
    globalFunc = updateFunc($('#func-global'), "");

    globalFunc();
}

var generationFunc;
function generation(x, y, n, age){
    if(generationFunc!=null) return generationFunc(x, y, n, age);
    return 0;
}

var colorFunc;
function color(age){
    if(colorFunc!=null) return colorFunc(age);
    return jQuery.Color("white");
}


function step(){
    var t0 = performance.now();

    var newField = makeArray(field.length);
    for(var x=0;x<width;x++){
        for(var y=0;y<height;y++){
            var coord = x + y * width;
            var n = (x==0 || y==0 || x+1==width || y+1==height) ? neighbours(x, y) : neighboursUnchecked(x, y);
            var age = field[coord];

            newField[coord] = generation(x, y, n, field[coord]);
        }
    }

    field = newField;

    var t1 = performance.now();

    $('#timing-step').text("step: "+Math.floor(t1-t0)+"ms");
}


function randomize(){
    var a = $('#randomize-age-a').val()|0;
    var b = $('#randomize-age-b').val()|0;

    for(var x=0;x<width;x++){
        for(var y=0;y<height;y++){
            var coord = x + y * width;

            field[coord] = Math.floor(a + (b-a+1) * Math.random());
        }
    }


    paint();
}

function blend(a, b, p){
    if(p<0) p=0; if(p>1) p=1;
    var q = 1 - p;

    var cr = a.red() * p + b.red() * q;
    var cg = a.green() * p + b.green() * q;
    var cb = a.blue() * p + b.blue() * q;

    return jQuery.Color( cr, cg, cb, 1.0 );
}

var colorValuesCache;
function updateColors(){
    colorValuesCache = {};
}

function colorValue(age){
    var cached = colorValuesCache[age];
    if(cached !== undefined) return cached;

    cached = color(age).rgba();
    colorValuesCache[age] = cached;

    return cached;
}

function paint(){
    var t0 = performance.now();

    var ctx = canvas.getContext("2d");

    var tempCanvas=document.createElement("canvas");
    tempCanvas.width=width;
    tempCanvas.height=height;
    var tctx=tempCanvas.getContext("2d");
    var imgdata = tctx.getImageData(0,0, width, height);

    for(var x=0;x<width;x++){
        for(var y=0;y<height;y++){
            var age = field[x + y * width];
            var i = x + y * width;

            var a = colorValue(age);
            imgdata.data[4*i] = a[0];
            imgdata.data[4*i+1] = a[1];
            imgdata.data[4*i+2] = a[2];
            imgdata.data[4*i+3] = 255;
        }
    }
    tctx.putImageData(imgdata,0,0);
    ctx.save();

    if(! $('#button-interpolation').is(":checked")) {
        ctx.mozImageSmoothingEnabled = false;
        ctx.imageSmoothingEnabled = false;
    }
    ctx.scale(tileSize,tileSize);
    ctx.drawImage(tempCanvas,0,0);
    ctx.restore();

    var t1 = performance.now();

    $('#timing-render').text("render: "+Math.floor(t1-t0)+"ms");
}

function autoStep(){
    if(! $('#button-auto').is(":checked")) return;

    step();
    paint();

    var period = $('#auto-period').val() || 100;
    window.setTimeout(autoStep, period);
}
