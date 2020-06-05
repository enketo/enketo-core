/**
 * Table of Contents (toc) module.
 *
 * @module toc
 */

import { getAncestors, getSiblingElements } from './dom-utils';

export default {
    /**
     * @type {Array}
     * @default
     */
    tocItems: [],
    /**
     * @type {number}
     * @default
     */
    _maxTocLevel: [],
    /**
     * Generate ToC Items
     */
    generateTocItems() {
        this.tocItems = [];
        const tocElements = [ ...this.form.view.$[ 0 ].querySelectorAll( '.question:not([role="comment"]), .or-group' ) ]
            .filter( tocEl => {
                return !tocEl.closest( '.disabled' ) &&
                    ( tocEl.matches( '.question' ) || tocEl.querySelector( '.question:not(.disabled)' ) ||
                        // or-repeat-info is only considered a page by itself if it has no sibling repeats
                        // When there are siblings repeats, we use CSS trickery to show the + button underneath the last
                        // repeat.
                        ( tocEl.matches( '.or-repeat-info' ) && getSiblingElements( tocEl, '.or-repeat' ).length === 0 ) );
            } )
            .filter( tocEl => !tocEl.classList.contains( 'or-repeat-info' ) );
        tocElements.forEach( ( element, index ) => {
            const groupParents = getAncestors( element, '.or-group' );
            this.tocItems.push( {
                element: element,
                level: groupParents.length,
                parent: groupParents.length > 0 ? groupParents[ groupParents.length - 1 ] : null,
                tocId: index,
                tocParentId: null
            } );
        } );

        this._maxTocLevel = Math.max.apply( Math, this.tocItems.map( el => el.level ) );
        const newTocParents = this.tocItems.filter( item => item.level < this._maxTocLevel && item.element.classList.contains( 'or-group' ) );

        this.tocItems.forEach( item => {
            const parentItem = newTocParents.find( parent => item.parent === parent.element );
            if ( parentItem ) {
                item.tocParentId = parentItem.tocId;
            }
        } );
    },
    /**
     * Generate ToC Html Fragment
     *
     * @return {DocumentFragment} HTML list element containing Table of Contents
     */
    getHtmlFragment() {
        this.generateTocItems();

        const toc = document.createDocumentFragment();

        let currentTocLevel = 0;
        do {
            const currentTocLevelItems = this.tocItems.filter( item => item.level === currentTocLevel );

            if ( currentTocLevel === 0 ) {
                this._buildTocHtmlList( currentTocLevelItems, toc );
            } else {
                const currentLevelParentIds = [ ...new Set( currentTocLevelItems.map( item => item.tocParentId ) ) ];

                currentLevelParentIds.forEach( parentId => {
                    const tocList = document.createElement( 'ul' );
                    const currentLTocevelItemsWithSameIds = currentTocLevelItems.filter( item => item.tocParentId === parentId );

                    this._buildTocHtmlList( currentLTocevelItemsWithSameIds, tocList );

                    const tocParent = toc.querySelectorAll( '[tocId="' + parentId + '"]' )[ 0 ];
                    tocParent.appendChild( tocList );
                } );
            }

            currentTocLevel++;
        } while ( currentTocLevel <= this._maxTocLevel );

        return toc;
    },
    /**
     * Get Title of Current ToC Element
     *
     * @param {Element} el - HTML element that serves as page
     */
    _getTitle( el ) {
        let tocItemText;
        const labelEl = el.querySelector( '.question-label.active' );
        if ( labelEl ) {
            tocItemText = labelEl.textContent;
        } else {
            const hintEl = el.querySelector( '.or-hint.active' );
            if ( hintEl ) {
                tocItemText = hintEl.textContent;
            }
        }
        tocItemText = tocItemText && tocItemText.length > 20 ? `${tocItemText.substring( 0,20 )}...` : tocItemText;

        return tocItemText;
    },
    /**
     * Builds List of ToC Items
     *
     * @param {Array<object>} items - ToC list of items
     * @param {Element} appendTo - HTML Element to append ToC list to
     */
    _buildTocHtmlList( items, appendTo ) {
        if ( items.length > 0 ) {
            items.forEach( item => {
                const tocListItem = document.createElement( 'li' );
                if ( item.element.classList.contains( 'or-group' ) ) {
                    const groupTocTitle = document.createElement( 'summary' );
                    groupTocTitle.textContent = this._getTitle( item.element ) || `[${item.tocId + 1}]`;

                    const groupToc = document.createElement( 'details' );
                    groupToc.setAttribute( 'tocId', item.tocId );
                    if ( item.tocParentId !== null ) {
                        groupToc.setAttribute( 'tocParentId', item.tocParentId );
                    }
                    groupToc.append( groupTocTitle );

                    tocListItem.append( groupToc );
                } else {
                    const a = document.createElement( 'a' );
                    a.textContent = this._getTitle( item.element ) || `[${item.tocId + 1}]`;

                    tocListItem.setAttribute( 'tocId', item.tocId );
                    tocListItem.setAttribute( 'role', 'pageLink' );
                    if ( item.tocParentId !== null ) {
                        tocListItem.setAttribute( 'tocParentId', item.tocParentId );
                    }
                    tocListItem.append( a );
                }
                appendTo.append( tocListItem );
            } );
        }
    }
};
