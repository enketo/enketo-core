import Widget from '../../js/widget';
import { isNumber } from '../../js/utils';
import events from '../../js/event';

/**
 * @augments RangeWidget
 */
class RatingWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.or-appearance-rating input[type="number"]';
    }

    _init() {
        const fragment = document.createRange().createContextualFragment( this._getHtmlStr() );
        this.element.after( fragment );
        this.element.classList.add( 'hide' );
        this.widget = this.question.querySelector( '.widget' );

        let ratingStars = '',
            name = Math.random().toString( 36 ).substring( 2, 15 );
        for ( let i = this.props.min; i <= this.props.max; i += this.props.step ) {
            ratingStars += `<input type=radio name="rating-stars__${name}" class="rating-widget__rating__star ignore" value="${i}"/>`;
        }

        this.widget.querySelector( '.rating-widget__rating' )
            .append( document.createRange().createContextualFragment( ratingStars ) );

        this.rating = this.widget.querySelector( '.rating-widget__rating' );
        this.stars = this.rating.querySelectorAll( '.rating-widget__rating__star' );
        this.stars.forEach( el => {
            el.addEventListener( 'change', () => {
                const selected = this.rating.querySelector( 'input:checked' );
                // contains class 'empty' means first load
                if ( ( this.value != selected.value || this.rating.classList.contains( 'empty' ) ) ) {
                    this.value = selected.value;
                }
            } );
        } );

        // loads the default value if exists
        this.update();

        if ( this.props.readonly ) {
            this.disable();
        }
    }

    /**
     * This is separated so it can be extended (in the analog-scale widget)
     *
     * @return {string} HTML string
     */
    _getHtmlStr() {
        return `<div class="widget rating-widget">
                	<div class="rating-widget__rating empty"></div>
            	</div>`;
    }

    /**
     * Disables widget
     */
    disable() {
        this.stars.forEach( el => el.disabled = true );
    }

    /**
     * Enables widget
     */
    enable() {
        this.stars.forEach( el => el.disabled = false );
    }

    /**
     * Updates widget
     */
    update() {
        const value = this.element.value;
        if ( isNumber( value ) ) {
            this.stars.forEach( ( star ) => {
                if ( star.value === value ) {
                    star.checked = true;
                    star.dispatchEvent( events.Change() );
                }
            } );
        } else {
            this._reset();
        }
    }

    /**
     * Resets widget
     */
    _reset() {
        const selected = this.rating.querySelector( 'input:checked' );
        if ( selected ) {
            this.value = '';
            selected.checked = false;
        }
    }

    /**
     * @type {object}
     */
    get props() {
        const props = this._props;
        const min = isNumber( this.element.getAttribute( 'min' ) ) ? this.element.getAttribute( 'min' ) : 0;
        const max = isNumber( this.element.getAttribute( 'max' ) ) ? this.element.getAttribute( 'max' ) : 10;
        const step = isNumber( this.element.getAttribute( 'step' ) ) ? this.element.getAttribute( 'step' ) : 1;

        props.min = Number( min );
        props.max = Number( max );
        props.step = Number( step );

        return props;
    }

    /**
     * @type {string}
     */
    get value() {
        return this.originalInputValue;
    }

    set value( value ) {
        this.originalInputValue = value;
        this.rating.classList.toggle( 'empty', value === '' );
    }

}

export default RatingWidget;
