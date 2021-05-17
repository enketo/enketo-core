/**
 * @module readonly
 */

export default {
    /**
     * Updates readonly
     *
     * @param {UpdatedDataNodes} [updated] - The object containing info on updated data nodes.
     */
    update( updated ) {
        const nodes = this.form.getRelatedNodes( 'readonly', '', updated ).get();
        nodes.forEach( node =>  {
            node.closest( '.question' ).classList.add( 'readonly' );

            const path = this.form.input.getName( node );
            const action = this.form.view.html.querySelector( `[data-setvalue][data-event="xforms-value-changed"][name="${path}"], [data-setgeopoint][data-event="xforms-value-changed"][name="${path}"]` );

            // Note: the readonly-forced class is added for special readonly views of a form.
            const empty = !node.value && !node.dataset.calculate && !action && !node.classList.contains( 'readonly-forced' );

            node.classList.toggle( 'empty', empty );

            if( empty ){
                node.setAttribute( 'aria-hidden', 'true' );
            }else{
                node.removeAttribute( 'aria-hidden' );
            }
        } );
    }
};
