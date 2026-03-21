import { TwistyPlayer } from "https://cdn.cubing.net/js/cubing/twisty"
// import { debugKeyboardConnect } from "https://cdn.cubing.net/js/cubing/bluetooth";
import { Alg, Move } from "https://cdn.cubing.net/js/cubing/alg";
// import { FaceletScaleProp } from "https://cdn.cubing.net/js/cubing/twisty/model/props/puzzle/display/FaceletScaleProp.ts"
import { isMobile } from "./timer.js";
import { keymap } from "./keyboardMappings.js";

let virtMoves = ''
let setVirtMoves = (val) => { virtMoves = val }
let virtEnabled = false

const virtualCube = new TwistyPlayer({
    puzzle: "3x3x3",
    hintFacelets: "none",
    backView: "none",
    background: "none",
    controlPanel: "none",
    experimentalDragInput: "none",
    tempoScale: "5",
    cameraLatitude: 45,
    cameraLongitude: 1,
    cameraLatitudeLimit: 45,
    alg: new Alg()
});

// disable virtual cube controls (for now) if on mobile
if (isMobile()) {
    document.getElementById("vctoggle").remove();
    document.getElementById("vcoptions").remove();
}
else {
    document.getElementById('vctoggle').addEventListener('click', toggleVC);
}

function initializeVirtualCube() {
    // fetch container to insert VC
    const timer = document.getElementById("timer");

    // cubing.js player
    virtualCube.style.display = "none"
    virtualCube.style.margin = "auto"
    virtualCube.style.width = "100%"
    virtualCube.style.height = "70%"

    timer.prepend(virtualCube);
}
function processVirtInput(event) {
    let keyCode = event.code
    let isShift = event.shiftKey
    if (keyCode in keymap) {
        let newMove = isShift ? keymap[keyCode][2] : keymap[keyCode][1]
        if (options[2][1]) {
            if (newMove) {
                try {
                    virtualCube.experimentalAddAlgLeaf(new Move(newMove))
                } catch (e) {
                    console.warn('Bad alg leaf ' + newMove + ' ' + e.stackTrace)
                }
            }
        }
        else {
            // virtualCube.experimentalAppendMove(new Move(newMove))
            virtMoves += " " + newMove
            virtualCube.alg = virtMoves
        }
    }
}

function toggleVC() {
    if (virtEnabled) {
        // DISABLE VC
        document.getElementById("vcoptions").style.display = "none"
        document.getElementById("vctoggle").innerHTML = `Enable Virtual Cube`
        document.getElementById("vctoggle").style.backgroundColor = "#c6cbcb"

        document.querySelector("twisty-player").style.display = "none";
    }
    else {
        // ENABLE VC
        document.getElementById("vcoptions").style.display = null
        document.getElementById("vctoggle").innerHTML = `<b>Disable Virtual Cube</b>`
        document.getElementById("vctoggle").style.backgroundColor = "#95a5a6"

        document.querySelector("twisty-player").style.display = "grid";
    }
    virtEnabled = !virtEnabled
}

let options = [
    // [Name of option, default, type of option, onClick]
    // oh dear god I miss you TS and react, take me back please
    ["Drag Rotating with Mouse",
        false,
        "bool",
        setOption => {
            options[0][1] ? virtualCube.experimentalDragInput = "none" : virtualCube.experimentalDragInput = "auto"
            options[0][1] = !options[0][1]
            console.log("Dragging set to " + options[0][1])
        }
    ],
    ["ZBLS Stickering",
        false,
        "bool",
        setOption => {
            options[1][1] ? virtualCube.experimentalStickering = "full" : virtualCube.experimentalStickering = "ZBLS"
            options[1][1] = !options[1][1]
            console.log("ZBLS now " + options[1][1])
        }
    ],
    ["Smooth Move Animation",
        false,
        "bool",
        setOption => {
            options[2][1] = !options[2][1]
            window.smoothMovement = options[2][1]
            virtualCube.alg = ''
            console.log("move animation " + options[2][1])
        }
    ],
    ["Back Hint Stickers",
        false,
        "bool",
        setOption => {
            options[3][1] ? virtualCube.hintFacelets = "none" : virtualCube.hintFacelets = "floating"
            options[3][1] = !options[3][1]
            console.log("hint stickers now " + options[3][1])
        }
    ],
    // not functional
    // ["Smaller Facelet Size",
    //     false,
    //     "bool",
    //     setOption => {
    //         options[4][1] ? virtualCube.experimentalModel.twistySceneModel.faceletScale = "auto" : virtualCube.experimentalModel.twistySceneModel.faceletScale = .5
    //         options[4][1] = !options[4][1]
    //         console.log("smaller facelet " + options[4][1])
    //     }
    // ],
]

// TODO - update dark mode, split up VC file into multiple files, saving templates + options, stopping timer when f2l + EO is done), saving of options, ffs clean up the codebase / tsify it
export { virtEnabled, virtualCube, initializeVirtualCube, processVirtInput, options, virtMoves, setVirtMoves }


