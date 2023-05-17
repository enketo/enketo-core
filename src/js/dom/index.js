/**
 * These exports from the collections, features, refs and tree-walker modules
 * are used to implement several performance optimizations around aspects of a
 * form which are static or highly cacheable. See each export's JSDoc for
 * further details.
 */

export {
    initCollections,
    invalidateRepeatCaches,
    resetCollections,
} from './collections';
export { detectFeatures } from './features';
export { setRefTypeClasses } from './refs';
export { findMarkerComment, findMarkerComments } from './tree-walker';
