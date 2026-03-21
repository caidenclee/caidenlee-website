// returns visualcube picture URL for scramble
function scrambleToVcUrl(scramble) {
    // let viewOption = (topOr3D == '3D') ? "r=y-35x-30" : "r=y35x-30";
    let viewOption = 'r=y35x-30'
    return "https://bestsiteever.ru/visualcube/visualcube.php?fmt=svg&bg=t&stage=vh&"+viewOption+"&alg=" +
        encodeURI(scramble).replace(/\'/g, "%27");
}

// add image for this scramble to browser cache
function preloadImage(scramble) {
    if (scramble != "") {
        (new Image()).src = scrambleToVcUrl(scramble);
    }
}

export { preloadImage, scrambleToVcUrl }
