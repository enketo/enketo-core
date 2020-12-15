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
            const setValue = this.form.view.html.querySelector( `[data-setvalue][data-event="xforms-value-changed"][name="${path}"]` );

            // Note: the readonly-forced class is added for special readonly views of a form.
            const empty = !node.value && !node.dataset.calculate && !setValue && !node.classList.contains( 'readonly-forced' );

            node.classList.toggle( 'empty', empty );
        } );
    }
};
