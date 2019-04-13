// TODO: add second "propagate" parameter to constructors to add .enketo namespace to event.

function DataUpdate( detail ) {
    return new CustomEvent( 'dataupdate', { detail } );
}

function FakeFocus() {
    return new CustomEvent( 'fakefocus', { bubbles: true } );
}

function ApplyFocus() {
    return new CustomEvent( 'applyfocus' );
}

function PageFlip() {
    return new CustomEvent( 'pageflip', { bubbles: true } );
}

function Removed( detail ) {
    return new CustomEvent( 'removed', { detail, bubbles: true } );
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

function InputUpdate() {
    return new CustomEvent( 'inputupdate', { bubbles: true } );
}

function Edited() {
    return new CustomEvent( 'edited', { bubbles: true } );
}

function ValidationComplete() {
    return new CustomEvent( 'validationcomplete', { bubbles: true } );
}

function Invalidated() {
    return new CustomEvent( 'invalidated', { bubbles: true } );
}

function ProgressUpdate( detail ) {
    return new CustomEvent( 'progressupdate', { detail, bubbles: true } );
}

function GoToHidden() {
    return new CustomEvent( 'gotohidden', { bubbles: true } );
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
    InputUpdate,
    Edited,
    ValidationComplete,
    Invalidated,
    ProgressUpdate,
    GoToHidden
};
