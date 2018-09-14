function getSiblingElementsAndSelf( element, selector ) {
    var siblings = [ element ];
    var prev = element.previousElementSibling;
    var next = element.nextElementSibling;

    selector = typeof selector === 'undefined' ? '*' : selector;

    while ( prev ) {
        if ( prev.matches( selector ) ) {
            siblings.unshift( prev );
        }
        prev = prev.previousElementSibling;
    }

    while ( next ) {
        if ( next.matches( selector ) ) {
            siblings.push( next );
        }
        next = next.nextElementSibling;
    }
    return siblings;
}

module.exports = {
    getSiblingElementsAndSelf: getSiblingElementsAndSelf
};
