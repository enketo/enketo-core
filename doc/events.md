Events in Enketo Core
=======================

##### inputupdate.enketo
Fired on a form control when it is progammatically updated and when this results in a change in value

#### valuechange.enketo
Fired on a form control when it is updated by the user and when this results in a change in value

##### dataupdate
Fired on model.$events, when a single model value has changed its value, a repeat is added, or a node is removed. It passes an "update object".

##### dataupdate.enketo
Propagates the internal 'dataupdate' event by firing it on the form.or element.

##### validated
Fired on model.$events when a single model node has passed constraint, datatype and required validation. Custom object can be added.

##### validated.enketo
Propagates the internal 'validated' event by firing it on the form.or element.

##### removed
Fired on model.$events, when a node is removed. It passes an "update object".

##### removed.enketo
Propagates the internal 'removed' event by firing it on the form.or element.
