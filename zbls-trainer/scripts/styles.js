// TODO: gradient of UI?
let theme = {
    dark: {
        bg: '#1e1e1d',
        menuBG: '#333',
        text: '#ede5d7',
        link: '#4eeee4',
        border: 'rgb(84 86 84)',
        button: {
            color: 'rgb(91, 93, 91)',
            hover: 'rgb(108, 110, 108)',
        },
        selection: {
            full: '#41911d',
            partial: '#78751d',
            empty: '#1e1e1d' // use bg color
        },
        keyboard: {
            shiftText: '#c2bc6e',
            spacer: '#444444',
            key: '#777777',
            normalText: '#ede5d7', // use text color
        }
    },
    light: {
        bg: 'rgb(227 227 227)',
        menuBG: '#c9c9c9',
        text: '#1d2026',
        link: '#4eeee4',
        border: 'rgb(84 86 84)',
        button: {
            color: '#acacac',
            hover: '#999999',
        },
        selection: {
            full: '#43d601',
            partial: '#dfcc20',
            empty: 'rgb(227 227 227)' // use bg color
        },
        keyboard: {
            // TODO: test these out
            shiftText: '#c2bc6e',
            spacer: '#444444',
            key: '#777777',
            normalText: '#ede5d7', // use text color
        }
    }
}

//saves to localstorage
function savestyle() {
    try {
        localStorage.setItem('bgcolor_in', document.getElementById("bgcolor_in").value);
        localStorage.setItem('textcolor_in', document.getElementById("textcolor_in").value);
        localStorage.setItem('linkscolor_in', document.getElementById("linkscolor_in").value);
        return true;
    }
    catch(e) { return false; }
}

//loads from localstorage
function loadstyle() {
    try {
        var bgcolor = localStorage.getItem('bgcolor_in');
        if (bgcolor.length > 0) {
            document.getElementById("bgcolor_in").value = localStorage.getItem('bgcolor_in');
            document.getElementById("textcolor_in").value = localStorage.getItem('textcolor_in');
            document.getElementById("linkscolor_in").value = localStorage.getItem('linkscolor_in');
            return true;
        }
    }
    catch(e) { return false; }
}

function applystyle() {
    document.getElementById("bodyid").style.backgroundColor = document.getElementById("bgcolor_in").value;
    document.getElementById("bodyid").style.color = timertext.style.color = document.getElementById("textcolor_in").value;
    var inputs = document.getElementsByClassName("settinginput");
    Array.prototype.forEach.call(inputs, function(el) {
        el.style.backgroundColor = document.getElementById("bgcolor_in").value;
        el.style.color = document.getElementById("textcolor_in").value;
    });
    var links = document.getElementsByTagName("a");
    Array.prototype.forEach.call(links, function(el) {
        el.style.color = document.getElementById("linkscolor_in").value;
    });
    savestyle();
}

function resetStyle(dark) {
    document.getElementById("bgcolor_in").value = dark ? "#16161a" : "#f5f5f5";
    document.getElementById("textcolor_in").value = dark? "white" : "black";
    document.getElementById("linkscolor_in").value = dark ? "#0ff" : "#004411";
    applystyle();
    savestyle();
}

function toggleColorSettings() {
    var d = document.getElementById("colorSettings").style.display;
    console.log(d);
    document.getElementById("colorSettings").style.display = (d == "inline") ?  "none" : "inline";
    console.log(document.getElementById("colorSettings").style.display);
}

if (!loadstyle()) { resetStyle(1); } else { applystyle(); }
window.resetStyle = resetStyle
window.toggleColorSettings = toggleColorSettings

export { theme, applystyle }