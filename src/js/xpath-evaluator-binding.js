import XPathJS from 'openrosa-xpath-evaluator';

/**
 * @function xpath-evaluator-binding
 * @param {Function} addExtensions - extension function
 */
export default function( addExtensions ) {
    const evaluator = new XPathJS.XPathEvaluator();

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
        addExtensions( XPathJS );
    }

    XPathJS.bindDomLevel3XPath( this.xml, {
        'window': {
            JsXPathException: true,
            JsXPathExpression: true,
            JsXPathNSResolver: true,
            JsXPathResult: true,
            JsXPathNamespace: true
        },
        'document': {
            jsCreateExpression( ...args ) {
                return evaluator.createExpression( ...args );
            },
            jsCreateNSResolver( ...args ) {
                return evaluator.createNSResolver( ...args );
            },
            jsEvaluate( ...args ) {
                return evaluator.evaluate( ...args );
            }
        }
    } );
}
