import OpenRosaXPath from 'openrosa-xpath-evaluator';

// This file is separated so it can be easily overwritten (with a different evaluator that works in IE11).

/**
 * @function xpath-evaluator-binding
 */
export default function( ) {
    const evaluator = OpenRosaXPath();
    this.xml.jsEvaluate = evaluator.evaluate;
}
