function getSiblingElementsAndSelf( element, selector ) {
    const siblings = [ element ];
    let prev = element.previousElementSibling;
    let next = element.nextElementSibling;

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

export {
    getSiblingElementsAndSelf
};
