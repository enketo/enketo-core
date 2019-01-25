// TODO: add second "propagate" parameter to constructors to add .enketo namespace to event.

function DataUpdate( detail ) {
    return new CustomEvent( 'dataupdate', { detail } );
}

function FakeFocus() {
    return new CustomEvent( 'fakefocus' );
}

function ApplyFocus() {
    return new CustomEvent( 'applyfocus' );
}

function PageFlip() {
    return new CustomEvent( 'pageflip' );
}

function Removed( detail ) {
    return new CustomEvent( 'removed', { detail } );
}

function AddRepeat( detail ) {
    return new CustomEvent( 'addrepeat', { detail, bubbles: true } );
}

function RemoveRepeat() {
    return new CustomEvent( 'removerepeat', { bubbles: true } );
}

function ChangeLanguage() {
    return new CustomEvent( 'changelanguage', { bubbles: true } );
}

function Change() {
    return new Event( 'change', { bubbles: true } );
}

function Input() {
    return new Event( 'input', { bubbles: true } );
}

export default {
    DataUpdate,
    FakeFocus,
    ApplyFocus,
    PageFlip,
    Removed,
    AddRepeat,
    RemoveRepeat,
    ChangeLanguage,
    Change,
    Input,
};
