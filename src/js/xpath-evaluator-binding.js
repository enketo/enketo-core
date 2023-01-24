import OpenRosaXPath from 'openrosa-xpath-evaluator';

/**
 * This file is separated so it can be easily extended with custom XPath functions or
 * overwritten with a different evaluator.
 */

/**
 * @function xpath-evaluator-binding
 */
export default function () {
    const evaluator = OpenRosaXPath();
    this.xml.jsEvaluate = evaluator.evaluate;
}
