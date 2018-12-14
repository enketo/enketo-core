// TODO: add second "propagate" parameter to constructors to add .enketo namespace to event.
// TODO: I'm not sure what the instanceof check does

function DataUpdate( detail ) {
    if ( !( this instanceof DataUpdate ) ) {
        return new DataUpdate( detail );
    }
    return new CustomEvent( 'dataupdate', { detail } );
}

function FakeFocus() {
    if ( !( this instanceof FakeFocus ) ) {
        return new FakeFocus();
    }
    return new CustomEvent( 'fakefocus' );
}

function ApplyFocus() {
    if ( !( this instanceof ApplyFocus ) ) {
        return new ApplyFocus();
    }
    return new CustomEvent( 'applyfocus' );
}

function PageFlip() {
    if ( !( this instanceof PageFlip ) ) {
        return new PageFlip();
    }
    return new CustomEvent( 'pageflip' );
}

function Removed( detail ) {
    if ( !( this instanceof Removed ) ) {
        return new Removed( detail );
    }
    return new CustomEvent( 'removed', { detail } );
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
    Change,
    Input,
};
