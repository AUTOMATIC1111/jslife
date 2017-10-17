
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

    $('#color-birth, #color-death, #color-growth, #color-decay, #age-growth, #age-decay').change(function(){
        updateColors();
    });

    $('#func-survival, #func-birth').change(function(){
        updateFunctions();
    });
    updateFunctions();
});

var width = 100;
var height = 100;
var tileSize = 5;

var field;
var auto = false;

var canvas;

function makeArray(size){
    return Array.apply(0, Array(size)).map(function () { return -1000 });
}

function create(){
    $('#canvas').empty();

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
        if(painting) field[coord] = 1;
        if(erasing) field[coord] = -1000;

        paint();
    };

    canvas.addEventListener('mousedown', function(event) {
        var coord = coords(event);
        if(coord == -1) return;

        var isPopulated = field[coord]>0;
        painting = ! isPopulated;
        erasing = isPopulated;

        clicked(coord);
    }, false);

    canvas.addEventListener('mousemove', function(event) {
        if(! painting && !erasing) return;

        var coord = coords(event);
        if(coord == -1) return;

        clicked(coord);
    }, false);

    canvas.addEventListener('mouseup', function(event) {
        var coord = coords(event);
        if(coord == -1) return;

        painting = 0;
        erasing = 0;

        clicked(coord);
    }, false);

    paint();
}

function get(x,y){
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

function updateFunc(elem){
    var errorElem = elem.parent().find(".error-message");

    try {
        var res = eval('var v = function(x, y) { ' + elem.val() + ' }; v');

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
    survivalFunc = updateFunc($('#func-survival'));
    birthFunc = updateFunc($('#func-birth'));
}

var survivalFunc;
function survival(x, y){
    if(survivalFunc!=null) return survivalFunc(x, y);

    var n = neighbours(x, y);

    return n==2 || n==3;
}

var birthFunc;
function birth(x, y){
    if(birthFunc!=null) return birthFunc(x, y);

    var n = neighbours(x, y);

    return n==3;
}

function step(){
    var newField = makeArray(field.length);

    for(var x=0;x<width;x++){
        for(var y=0;y<height;y++){
            var coord = x + y * width;

            if(field[coord]>0){
                newField[coord] = survival(x, y) ? field[coord] + 1 : 0;
            } else{
                newField[coord] = birth(x, y) ? 1 : field[coord] - 1;
            }
        }
    }

    field = newField;
}

function blend(a, b, p){
    if(p<0) p=0; if(p>1) p=1;
    var q = 1 - p;

    var cr = a.red() * p + b.red() * q;
    var cg = a.green() * p + b.green() * q;
    var cb = a.blue() * p + b.blue() * q;

    return jQuery.Color( cr, cg, cb, 1.0 );
}

var colorCache;
var colorValuesCache;
var colorBirth;
var colorGrowth;
var colorDeath;
var colorDecay;
var decayAge;
var growthAge;

function updateColors(){
    colorCache = {};
    colorValuesCache = {};

    colorBirth = jQuery.Color( '#'+$('#color-birth').val() );
    colorGrowth = jQuery.Color( '#'+$('#color-growth').val() );
    colorDeath = jQuery.Color( '#'+$('#color-death').val() );
    colorDecay = jQuery.Color( '#'+$('#color-decay').val() );
    decayAge = parseInt($('#age-decay').val()) || 1;
    growthAge = parseInt($('#age-growth').val()) || 1;
}

function color(age){
    var cached = colorCache[age];
    if(cached !== undefined) return cached;

    if(age > 0){
        cached = blend(colorGrowth, colorBirth, (age-1)*1.0/growthAge);
    } else{
        cached = blend(colorDecay, colorDeath, -age*1.0/decayAge);
    }

    colorCache[age] = cached;
    return cached;
}

function colorValue(age){
    var cached = colorValuesCache[age];
    if(cached !== undefined) return cached;

    cached = color(age).rgba();
    colorValuesCache[age] = cached;

    return cached;
}

function paint(){
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

}

function autoStep(){
    if(! $('#button-auto').is(":checked")) return;

    step();
    paint();

    var period = $('#auto-period').val() || 100;
    window.setTimeout(autoStep, period);
}
