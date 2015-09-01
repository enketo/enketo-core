var XPathJS = require( 'enketo-xpathjs' );

module.exports = function() {
    var evaluator = new XPathJS.XPathEvaluator();

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
