import Widget from '../../js/widget';

/**
 * Column (select) Widgets. Adds a filler if the last row contains two elements.
 * The filler avoids the last radiobutton or checkbox to not be lined up correctly below the second column.
 *
 * @augments Widget
 */
class Columns extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question.or-appearance-columns';
    }

    _init() {
        this.element.querySelectorAll('.option-wrapper').forEach((wrapper) => {
            const COLUMNS = 3;

            let fillers =
                COLUMNS - (wrapper.querySelectorAll('label').length % COLUMNS);

            while (fillers < COLUMNS && fillers > 0) {
                wrapper.append(
                    document
                        .createRange()
                        .createContextualFragment(
                            '<label class="filler"></label>'
                        )
                );
                fillers--;
            }
            // if added to correct question type, add initialized class
            this.question.classList.add('or-columns-initialized');
        });
    }
}

export default Columns;
