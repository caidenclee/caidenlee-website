import { keyBoardMappings, keymap } from "./keyboardMappings.js";


const legalMoves = ["U", "R", "L", "D", "B", "F", "M", "E", "S", "u", "r", "l", "d", "b", "f", "x", "y", "z",
    "U'", "R'", "L'", "D'", "B'", "F'", "M'", "E'", "S'", "u'", "r'", "l'", "d'", "b'", "f'", "x'", "y'", "z'",
    "U2", "R2", "L2", "D2", "B2", "F2", "M2", "E2", "S2", "u2", "r2", "l2", "d2", "b2", "f2", "x2", "y2", "z2", ""]

class MoveValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "MoveValidationError";
    }
}

// mapping: String() (if I move to TS then Move[]) with a length of 61 (0-60 indicies), strings should be valid cube moves or ''
function loadKeymap(mapIndex) {
    let prevMap = keymap
    const mapping = keyBoardMappings[mapIndex]["map"]
    const shiftKeyMapping = keyBoardMappings[mapIndex]["shiftMap"]

    let i = 0
    // TODO: make these try/catch?
    for (let entry in keymap) {
        try {
            // add moves to keymap
            if (!legalMoves.includes(mapping[i])) throw new MoveValidationError("selected scheme includes illegal move " + mapping[i] + " in the normal map at position " + i)
            if (!legalMoves.includes(shiftKeyMapping[i])) throw new MoveValidationError("selected scheme includes illegal move " + shiftKeyMapping[i] + " in the shift map at position " + i)

            keymap[entry][1] = mapping[i]
            document.getElementById('key' + i + '-' + entry + 'mappedMove').innerText = mapping[i]

            keymap[entry][2] = shiftKeyMapping[i]
            document.getElementById('key' + i + '-' + entry + 'mappedMoveS').innerText = shiftKeyMapping[i]

            document.getElementById('keymapdescription').innerText = keyBoardMappings[mapIndex]['desc']

            i++
        } catch (e) {
            // revert keymap
            keymap = prevMap
            console.error(e.name, e.message)
            break
        }
    }
}

// update localstorage and keymap
function saveCustomKeyBind() { }

// update localstorage and keymap
function loadCustomKeybind() { }

// Debug func where I manually put in keys, run this function and copypaste the mapping from the console. 
// EDIT = might use this when saving to localStorage
function getMappingFromKeymap() {
    let map = []
    let smap = []
    for (let entry in keymap) {
        map.push(keymap[entry][1])
        smap.push(keymap[entry][1])
    }
    return {title: '', desc: '', map: map, shiftMap: smap}
}

export { legalMoves, saveCustomKeyBind, loadCustomKeybind, loadKeymap, getMappingFromKeymap }