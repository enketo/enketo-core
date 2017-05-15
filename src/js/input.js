'use strict';

/**
 * Input helper functions.
 */

module.exports = {
    // Multiple nodes are limited to ones of the same input type (better implemented as JQuery plugin actually)
    getWrapNodes: function( $inputNodes ) {
        var type = this.getInputType( $inputNodes.eq( 0 ) );
        return ( type === 'fieldset' ) ? $inputNodes : $inputNodes.closest( '.question, .calculation' );
    },
    /** very inefficient, should actually not be used **/
    getProps: function( $node ) {
        if ( $node.length !== 1 ) {
            return console.error( 'getProps(): no input node provided or multiple' );
        }
        return {
            path: this.getName( $node ),
            ind: this.getIndex( $node ),
            inputType: this.getInputType( $node ),
            xmlType: this.getXmlType( $node ),
            constraint: this.getConstraint( $node ),
            calculation: this.getCalculation( $node ),
            relevant: this.getRelevant( $node ),
            readonly: this.getReadonly( $node ),
            val: this.getVal( $node ),
            required: this.getRequired( $node ),
            enabled: this.isEnabled( $node ),
            multiple: this.isMultiple( $node )
        };
    },
    getInputType: function( $node ) {
        var nodeName;
        if ( $node.length !== 1 ) {
            return ''; //console.error('getInputType(): no input node provided or multiple');
        }
        nodeName = $node.prop( 'nodeName' ).toLowerCase();
        if ( nodeName === 'input' ) {
            if ( $node.attr( 'type' ).length > 0 ) {
                return $node.attr( 'type' ).toLowerCase();
            } else {
                return console.error( '<input> node has no type' );
            }
        } else if ( nodeName === 'select' ) {
            return 'select';
        } else if ( nodeName === 'textarea' ) {
            return 'textarea';
        } else if ( nodeName === 'fieldset' || nodeName === 'section' ) {
            return 'fieldset';
        } else {
            return console.error( 'unexpected input node type provided' );
        }
    },
    getConstraint: function( $node ) {
        return $node.attr( 'data-constraint' );
    },
    getRequired: function( $node ) {
        // only return value if input is not a table heading input
        if ( $node.parentsUntil( '.or', '.or-appearance-label' ).length === 0 ) {
            return $node.attr( 'data-required' );
        }
    },
    getRelevant: function( $node ) {
        return $node.attr( 'data-relevant' );
    },
    getReadonly: function( $node ) {
        return $node.is( '[readonly]' );
    },
    getCalculation: function( $node ) {
        return $node.attr( 'data-calculate' );
    },
    getXmlType: function( $node ) {
        if ( $node.length !== 1 ) {
            return console.error( 'getXMLType(): no input node provided or multiple' );
        }
        return $node.attr( 'data-type-xml' );
    },
    getName: function( $node ) {
        var name;
        if ( $node.length !== 1 ) {
            return console.error( 'getName(): no input node provided or multiple' );
        }
        name = $node.attr( 'data-name' ) || $node.attr( 'name' );
        return name || console.error( 'input node has no name' );
    },
    /**
     * Used to retrieve the index of a question amidst all questions with the same name.
     * The index that can be used to find the corresponding node in the model.
     * NOTE: this function should be used sparingly, as it is CPU intensive!
     * TODO: simplify this function by looking for nodes with same CLASS on wrapNode
     *
     * @param  {jQuery} $node The jQuery-wrapped input element
     * @return {number}       The index
     */
    getIndex: function( $node ) {
        var inputType;
        var name;
        var $wrapNode;
        var $wrapNodesSameName;

        if ( $node.length !== 1 ) {
            return console.error( 'getIndex(): no input node provided or multiple' );
        }

        inputType = this.getInputType( $node );
        name = this.getName( $node );
        $wrapNode = this.getWrapNodes( $node );

        if ( inputType === 'radio' && name !== $node.attr( 'name' ) ) {
            $wrapNodesSameName = this.getWrapNodes( this.form.view.$.find( '[data-name="' + name + '"]' ) );
        }
        // fieldset.or-group wraps fieldset.or-repeat and can have same name attribute!)
        else if ( inputType === 'fieldset' && $node.hasClass( 'or-repeat' ) ) {
            $wrapNodesSameName = this.getWrapNodes( this.form.view.$.find( '.or-repeat[name="' + name + '"]' ) );
        } else if ( inputType === 'fieldset' && $node.hasClass( 'or-group' ) ) {
            $wrapNodesSameName = this.getWrapNodes( this.form.view.$.find( '.or-group[name="' + name + '"]' ) );
        } else {
            $wrapNodesSameName = this.getWrapNodes( this.form.view.$.find( '[name="' + name + '"]' ) );
        }

        return $wrapNodesSameName.index( $wrapNode );
    },
    isMultiple: function( $node ) {
        return ( this.getInputType( $node ) === 'checkbox' || $node.attr( 'multiple' ) !== undefined ) ? true : false;
    },
    isEnabled: function( $node ) {
        return !( $node.prop( 'disabled' ) || $node.parentsUntil( '.or', '.disabled' ).length > 0 );
    },
    getVal: function( $node ) {
        var inputType;
        var values = [];
        var name;

        if ( $node.length !== 1 ) {
            return console.error( 'getVal(): no inputNode provided or multiple' );
        }
        inputType = this.getInputType( $node );
        name = this.getName( $node );

        if ( inputType === 'radio' ) {
            return this.getWrapNodes( $node ).find( 'input:checked' ).val() || '';
        }
        // checkbox values bug in jQuery as (node.val() should work)
        if ( inputType === 'checkbox' ) {
            this.getWrapNodes( $node ).find( 'input[name="' + name + '"]:checked' ).each( function() {
                values.push( this.value );
            } );
            return values;
        }
        return ( !$node.val() ) ? '' : $node.val();
    },
    setVal: function( name, index, value ) {
        var $inputNodes;
        var type;
        var curVal;

        index = index || 0;

        if ( this.getInputType( this.form.view.$.find( '[data-name="' + name + '"]' ).eq( 0 ) ) === 'radio' ) {
            type = 'radio';
            $inputNodes = this.getWrapNodes( this.form.view.$.find( '[data-name="' + name + '"]' ) ).eq( index ).find( '[data-name="' + name + '"]' );
        } else {
            // why not use this.getIndex?
            $inputNodes = this.getWrapNodes( this.form.view.$.find( '[name="' + name + '"]' ) ).eq( index ).find( '[name="' + name + '"]' );
            type = this.getInputType( $inputNodes.eq( 0 ) );

            if ( type === 'file' ) {
                $inputNodes.eq( 0 ).attr( 'data-loaded-file-name', value );
                // console.error('Cannot set value of file input field (value: '+value+'). If trying to load '+
                //  'this record for editing this file input field will remain unchanged.');
                return false;
            }

            if ( type === 'date' || type === 'datetime' ) {
                // convert current value (loaded from instance) to a value that a native datepicker understands
                // TODO test for IE, FF, Safari when those browsers start including native datepickers
                value = this.form.model.node( name, index ).convert( value, type );
            }
        }

        if ( this.isMultiple( $inputNodes.eq( 0 ) ) === true ) {
            value = value.split( ' ' );
        } else if ( type === 'radio' ) {
            value = [ value ];
        }

        // Trigger an 'inputupdate' event which can be used in widgets to update the widget when the value of its 
        // original input element has changed **programmatically**.
        if ( $inputNodes.length ) {
            curVal = this.getVal( $inputNodes.eq( 0 ) );
            if ( curVal === undefined || curVal.toString() !== value.toString() ) {
                $inputNodes.val( value );
                // don't trigger on all radiobuttons/checkboxes
                $inputNodes.eq( 0 ).trigger( 'inputupdate.enketo' );
            }
        }

        return;
    },
    validate: function( $input ) {
        return this.form.validateInput( $input );
    }
};
