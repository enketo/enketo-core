var XPathJS = require( 'enketo-xpathjs' );

module.exports = function( addExtensions ) {
    var evaluator = new XPathJS.XPathEvaluator();

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
     * I'd recommend using `require('extension)(require('enketo-xpathjs'))` instead 
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
            jsCreateExpression: function() {
                return evaluator.createExpression.apply( evaluator, arguments );
            },
            jsCreateNSResolver: function() {
                return evaluator.createNSResolver.apply( evaluator, arguments );
            },
            jsEvaluate: function() {
                return evaluator.evaluate.apply( evaluator, arguments );
            }
        }
    } );
};
