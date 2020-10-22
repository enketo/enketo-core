/**
 * @typedef FormDataObj
 * @property {string} modelStr -  XML Model as string
 * @property {string} [instanceStr] - (partial) XML instance to load
 * @property {boolean} [submitted] - Flag to indicate whether data was submitted before
 * @property {object} [external] - Array of external data objects, required for each external data instance in the XForm
 * @property {string} [external.id] - ID of external instance
 * @property {string} [external.xmlStr] - XML string of external instance content
 */

/**
 * @typedef UpdatedDataNodes
 * @description The object containing info on updated data nodes
 * @property {Array<string>} [nodes]
 * @property {string} [repeatPath]
 * @property {number} [repeatIndex]
 * @property {string} [relevantPath]
 */

/**
 * @typedef {object} jQuery
 * @description jQuery collection
 */

