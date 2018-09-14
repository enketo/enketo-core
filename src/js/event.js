// TODO: add second "propagate" parameter to constructors to add .enketo namespace to event.

function DataUpdate( detail ) {
    if ( !( this instanceof DataUpdate ) ) {
        return new DataUpdate( detail );
    }
    return new CustomEvent( 'dataupdate', { detail: detail } );
}

function Removed( detail ) {
    if ( !( this instanceof Removed ) ) {
        return new Removed( detail );
    }
    return new CustomEvent( 'removed', { detail: detail } );
}

module.exports = {
    DataUpdate: DataUpdate,
    Removed: Removed
};
