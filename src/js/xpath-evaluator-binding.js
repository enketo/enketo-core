import orxe from 'openrosa-xpath-evaluator';

/**
 * @function xpath-evaluator-binding
 * @param {Function} addExtensions
 */
export default function( addExtensions ) {
    /*
     * Note: it's inefficient to extend XPathJS here (for every model instance)
     * instead of just once in the prototype.
     *
     * However, this is done to prevent breaking Medic Mobile.
     * The performance impact is probably negligible, since we don't instantiate
     * models very often.
     *
     * In any case, you don't have to use it like this. It was done for
     * Enketo Validate only. In an app that doesn't override enketo-xpathjs,
     * I'd recommend using `require('extension')(require('enketo-xpathjs'))` instead
     * and leave the addExtensions parameter empty here.
     */
    if ( typeof addExtensions === 'function' ) {
        addExtensions( orxe );
    }

    orxe.bindDomLevel3XPath( this.xml );
}
