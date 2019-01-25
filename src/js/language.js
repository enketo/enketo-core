/**
 * Form languages module.
 */

import { getSiblingElements } from './dom-utils';
import events from './event';

export default {
    init() {
        if ( !this.form ) {
            throw new Error( 'Language module not correctly instantiated with form property.' );
        }
        const root = this.form.view.html.closest( 'body' ) || this.form.view.html.parentNode;
        if ( !root ) {
            return;
        }
        const langSelector = root.querySelector( '.form-language-selector' );
        const formLanguages = this.form.view.html.querySelector( '#form-languages' );

        if ( !formLanguages ) {
            return;
        }

        const languages = [ ...formLanguages.querySelectorAll( 'option' ) ].map( option => option.value );
        if ( langSelector ) {
            langSelector
                .append( formLanguages );
            if ( languages.length > 1 ) {
                langSelector.classList.remove( 'hide' );
            }
        }
        this.formLanguages = root.querySelector( '#form-languages' );
        this._currentLang = this.formLanguages.dataset.defaultLang || languages[ 0 ] || '';
        const langOption = this.formLanguages.querySelector( `[value="${this._currentLang}"]` );
        const currentDirectionality = langOption && langOption.dataset.dir || 'ltr';

        this.formLanguages.value = this._currentLang;

        this.form.view.html.setAttribute( 'dir', currentDirectionality );

        if ( languages.length < 2 ) {
            return;
        }

        this.formLanguages.addEventListener( events.Change().type, event => {
            event.preventDefault();
            this._currentLang = event.target.value;
            this.setUi( this._currentLang );
        } );

        this.form.view.$.on( 'addrepeat', event => this.setUi( this._currentLang, event.target ) );
    },
    get currentLang() {
        return this._currentLang;
    },
    get currentLangDesc() {
        const langOption = this.formLanguages.querySelector( `[value="${this._currentLang}"]` );
        return langOption ? langOption.textContent : null;
    },
    setUi( lang, group = this.form.view.html ) {
        const dir = this.formLanguages.querySelector( `[value="${lang}"]` ).dataset.dir || 'ltr';
        const translations = [ ...group.querySelectorAll( '[lang]' ) ];

        this.form.view.html.setAttribute( 'dir', dir );
        translations.forEach( el => el.classList.remove( 'active' ) );
        translations
            .filter( el => el.matches( `[lang="${lang}"], [lang=""]` ) &&
                ( !el.classList.contains( 'or-form-short' ) || ( el.classList.contains( 'or-form-short' ) && getSiblingElements( el, '.or-form-long' ).length === 0 ) ) )
            .forEach( el => el.classList.add(
                'active'
            ) );

        // For use in locale-sensitive XPath functions.
        // Don't even check whether it's a proper subtag or not. It will revert to client locale if it is not recognized.
        window.enketoFormLocale = lang;

        this.form.view.html.querySelectorAll( 'select, datalist' ).forEach( el => this.setSelect( el ) );
        this.form.view.$.trigger( 'changelanguage' );
    },
    // swap language of <select> and <datalist> <option>s
    setSelect( select ) {
        const type = select.nodeName.toLowerCase();
        const question = select.closest( '.question' );
        const translations = question ? question.querySelector( '.or-option-translations' ) : null;

        if ( !translations ) {
            return;
        }

        [ ...select.children ].filter( el => el.matches( 'option' ) && !el.matches( '[value=""], [data-value=""]' ) )
            .forEach( option => {
                const curLabel = type === 'datalist' ? option.value : option.textContent;
                const value = type === 'datalist' ? option.dataset.value : option.value;
                const translatedOption = translations.querySelector( `.active[data-option-value="${value}"]` );
                let newLabel = curLabel;
                if ( translatedOption && translatedOption.textContent ) {
                    newLabel = translatedOption.textContent;
                }
                option.value = value;
                option.textContent = newLabel;
            } );
    }
};
