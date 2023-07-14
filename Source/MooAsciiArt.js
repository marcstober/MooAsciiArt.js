/*
---
description: An Ascii art generator/DOM converter

license: [MIT-style, LGPL]

authors:
- Abbey Hawk Sparrow (MooAsciiArt)
- Jacob Seidelin (jsAscii)
- Scott Gonzolez (Figlet js)

provides: [MooAsciiArt, Element.toAsciiArt]
...
*/

var MooAsciiArt = {
    value: 'variant1',
    valueScales: {
        variant1: ' .,:;i1tfLCG08@'.split(''),
        variant2: '@%#*+=-:. '.split('').reverse(),
        variant3: '#¥¥®®ØØ$$ø0oo°++=-,.    '.split('').reverse(),
        variant4: '#WMBRXVYIti+=;:,. '.split('').reverse(),
        'ultra-wide': ('MMMMMMM@@@@@@@WWWWWWWWWBBBBBBBB000000008888888ZZZZZZZZZaZaaaaaa2222222SSS'
            + 'SSSSXXXXXXXXXXX7777777rrrrrrr;;;;;;;;iiiiiiiii:::::::,:,,,,,,.........       ').split('').reverse(),
        wide: '@@@@@@@######MMMBBHHHAAAA&&GGhh9933XXX222255SSSiiiissssrrrrrrr;;;;;;;;:::::::,,,,,,,........        '.split('').reverse(),
        hatching: '##XXxxx+++===---;;,,...    '.split('').reverse(),
        bits: '# '.split('').reverse(),
        binary: '01 '.split('').reverse(),
        greyscale: '"█▓▒░ '.split('').reverse()
    },
    color: ' CGO08@'.split(''),
    font: 'courier new',
    fontPath: 'fonts/',
    invert: false,
    alpha: false,
    errorMode: 'console',
    mappedTags: {},
    map: function (tag, font) {
        this.mappedTags[tag] = font;
    },
    convertTags: function (tags) {
        for (tag in tags) {
            this.map(tag, tags[tag]);
            Array.from(document.getElementsByTagName(tag)).forEach(function (node) {
                convertNonImage(node, { inject: true })
            });
        }
    },
    convertImages: function (forceAll) {
        var elements = document.getElementsByTagName('img');
        //console.log(['imgs', elements]);
        Array.from(elements).forEach((img) => {
            if (img.complete) {
                if (!img.asciiArtBuffer) {
                    this.convertImage(img);
                }
            } else {
                img.addEventListener('load', () => {
                    if (!img.asciiArtBuffer) {
                        this.convertImage(img);
                    }
                })

            }
        })
    },

    convertImage: function (img) {
        convertImageCore(img, { invert: this.invert, alpha: this.alpha, inject: true });
    },
    //font handling stuff ported from Figlet
    fonts: {},
    parseFont: function (name, fn) {
        if (name in MooAsciiArt.fonts) {
            fn();
        }
        MooAsciiArt.loadFont(name, function (defn) {
            MooAsciiArt._parseFont(name, defn, fn);
        });
    },
    _parseFont: function (name, defn, fn) {
        var lines = defn.split("\n"),
            header = lines[0].split(" "),
            hardblank = header[0].charAt(header[0].length - 1),
            height = +header[1],
            comments = +header[5];
        MooAsciiArt.fonts[name] = {
            defn: lines.slice(comments + 1),
            hardblank: hardblank,
            height: height,
            char: {}
        };
        fn();
    },
    parseChar: function (char, font) {
        if (char > 122) return;
        var fontDefn = MooAsciiArt.fonts[font];
        if (char in fontDefn.char) return fontDefn.char[char];
        var height = fontDefn.height,
            start = (char - 32) * height,
            charDefn = [],
            i;
        for (i = 0; i < height; i++) {
            if (!fontDefn.defn[start + i]) return;
            charDefn[i] = fontDefn.defn[start + i].replace(/@/g, "")
                .replace(RegExp("\\" + fontDefn.hardblank, "g"), " ");
        }
        return fontDefn.char[char] = charDefn;
    },
    write: function (str, font, fn) {
        MooAsciiArt.parseFont(font, function () {
            var chars = {},
                result = "";
            for (var i = 0, len = str.length; i < len; i++) {
                chars[i] = MooAsciiArt.parseChar(str.charCodeAt(i), font);
            }
            for (i = 0, height = chars[0].length; i < height; i++) {
                for (var j = 0; j < len; j++) {
                    if (chars[j]) result += chars[j][i];
                }
                result += "\n";
            }
            fn(result, font);
        });
    },
    loadFont: function (name, fn) {
        fetch(this.fontPath + name + '.flf').then(response => {
            //console.log('Parsed an FLF('+this.fontPath + name+ '.flf)');
            return response.text()
        }).then(text => {
            fn(text)
        })
    }
};

function convertImageCore(el, options) {
    if (!options) {
        options = {};
    }
    // settings : prefer options over attributes over defaults
    var scale = options['scale'] ? options['scale'] : (el.getAttribute("asciiscale") ? parseInt(el.getAttribute("asciiscale")) : 1);
    var isColor = options['color'] == 'true' || options['color'] === true ? true : (el.getAttribute("asciicolor") == 'true' ? true : false);
    var isAlpha = options['alpha'] == 'true' || options['alpha'] === true ? true : (el.getAttribute("asciialpha") == 'true' ? true : false);
    var isBlock = options['block'] == 'true' || options['block'] === true ? true : (el.getAttribute("asciiblock") == 'true' ? true : false);
    var isInverted = options['invert'] == 'true' || options['invert'] === true ? true : (el.getAttribute("asciiinvert") == 'true' ? true : false);
    var resolution = options['resolution'] ? options['resolution'] : (el.getAttribute("asciiresolution") ? el.getAttribute("asciiresolution") : 'medium');
    var characters = options['characters'] ? options['characters'] : (el.getAttribute("asciichars") ? el.getAttribute("asciichars") : (isColor ? MooAsciiArt.color : MooAsciiArt.valueScales[MooAsciiArt.value]));
    //convert resolution enum to a value
    var resolutionMode = resolution;
    switch (resolution) {
        case "low": resolution = 0.25; break;
        case "medium": resolution = 0.5; break;
        case "high": resolution = 1; break;
        default: resolution = parseFloat(resolution);
    }
    //setup our resources
    var width = Math.round(parseInt(el.offsetWidth) * resolution);
    var height = Math.round(parseInt(el.offsetHeight) * resolution);
    if (!el.asciiArtBuffer) {
        el.asciiArtBuffer = document.createElement('canvas');
        el.asciiArtBuffer.width = width;
        el.asciiArtBuffer.height = height;
        el.styles = {
            width: width,
            height: height,
            display: 'none'
        }
    }
    if (!el.asciiArtBuffer.getContext) throw ('No buffer context available (Canvas unsupported?)');
    var context = el.asciiArtBuffer.getContext('2d');
    if (!context.getImageData) throw ('No buffer context available (getImageData unsupported?)');
    context.drawImage(el, 0, 0, width, height);
    var data = context.getImageData(0, 0, width, height).data;
    var strChars = "";
    var offset, red, green, blue, alpha, characterPosition, brightness, brightnessPosition, elChar;
    for (var y = 0; y < height; y += 2) {
        for (var x = 0; x < width; x++) {
            if (x % 3 == 0) continue; // account for the mismatch in scale of a char, here we assume 3:2 ratio and correct to 2:2
            offset = (y * width + x) * 4;
            red = data[offset];
            green = data[offset + 1];
            blue = data[offset + 2];
            alpha = data[offset + 3];
            if (alpha == 0) {
                brightnessPosition = 0;
            } else {
                if (isAlpha) brightness = (0.3 * red + 0.59 * green + 0.11 * blue) * (alpha / 255) / 255;
                else brightness = (0.3 * red + 0.59 * green + 0.11 * blue) / 255;
                characterPosition = (characters.length - 1) - Math.round(brightness * (characters.length - 1));
            }
            if (isInverted) characterPosition = (characters.length - 1) - characterPosition;
            thisChar = characters[characterPosition];
            if (thisChar == ' ') thisChar = '&nbsp;';
            if (isColor) {
                strChars += '<span style="'
                    + 'color:rgb(' + red + ',' + green + ',' + blue + ');'
                    + (isBlock ? 'background-color:rgb(' + red + ',' + green + ',' + iBlue + ');' : '')
                    + (isAlpha ? 'opacity:' + (alpha / 255) + ';' : '')
                    + '">' + thisChar + '</span>';
            } else {
                if (isAlpha) {
                    if (alpha / 255 < 0.3) strChars += ' ';
                    else strChars += thisChar
                } else strChars += thisChar;
            }
        }
        strChars += '<br/>';
    }
    var fontSize = (2 / resolution) * scale;
    var lineHeight = (2 / resolution) * scale;
    // adjust letter-spacing for all combinations of scale and resolution to get it to fit the image width.
    // AKA HACKY BULLSHIT
    // todo: annihilate
    var letterSpacing = 0;
    if (resolutionMode == "low") {
        switch (scale) {
            case 1: letterSpacing = -1; break;
            case 2:
            case 3: letterSpacing = -2.1; break;
            case 4: letterSpacing = -3.1; break;
            case 5: letterSpacing = -4.15; break;
        }
    }
    if (resolutionMode == "medium") {
        switch (scale) {
            case 1: letterSpacing = 0; break;
            case 2: letterSpacing = -1; break;
            case 3: letterSpacing = -1.04; break;
            case 4:
            case 5: letterSpacing = -2.1; break;
        }
    }
    if (resolutionMode == "high") {
        switch (scale) {
            case 1:
            case 2: letterSpacing = 0; break;
            case 3:
            case 4:
            case 5: letterSpacing = -1; break;
        }
    }
    var ascii = document.createElement('div')
    Object.assign(ascii.style, {
        display: 'block',
        width: Math.round(width / resolution * scale) + 'px',
        height: Math.round(height / resolution * scale) + 'px',
        'white-space': 'pre',
        margin: '0px',
        padding: '0px',
        'letter-spacing': letterSpacing + 'px',
        'font-family': MooAsciiArt.font,
        'font-size': fontSize + 'px',
        'line-height': lineHeight + 'px',
        'text-align': 'left',
        'text-decoration': 'none',
        //duplicate all the styles from the parent image
        float: el.style.float,
        padding: el.style.padding,
        border: el.style.border,
        margin: el.style.margin,
        position: el.style.position,
        top: el.style.top,
        bottom: el.style.bottom,
        left: el.style.left,
        right: el.style.right
    })

    ascii.innerHTML = (strChars);
    if (options.inject) {
        el.replaceWith(ascii);
    }
    if (options.returnText) return strChars;
    return ascii.cloneNode();
}

function convertNonImage(el, options) {
    if (el.getAttribute('asciiConverted') == 'true') return;
    var noActionFoundForTag = true;
    if (options.inject && MooAsciiArt.mappedTags[el.tagName.toLowerCase()]) {
        el.setAttribute('asciiConverted', 'true');
        MooAsciiArt.write(
            el.innerHTML,
            MooAsciiArt.mappedTags[el.tagName.toLowerCase()],
            result => {
                el.innerHTML = '<pre>' + result + '</pre>';
            }
        );
        noActionFoundForTag = false;
    }
    //console.log(['convert-', el.getAttribute('asciiConverted'), el]);
    if (noActionFoundForTag) {
        var message = 'ASCII conversion not supported on this node type(' + el.tagName + ')!';
        throw (message);
    }

}