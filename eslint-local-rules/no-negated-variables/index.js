/**
 * @param {String} name
 * @returns {Boolean}
 */
function isNegatedVariableName(name) {
    if (!name) {
        return;
    }

    return name.includes('Not')
      || name.includes('isNot')
      || name.includes('cannot')
      || name.includes('shouldNot')
      || name.includes('cant');
}

const message = 'Do not use negated variable names';

module.exports = {
    message,
    rule: {
        create: context => ({
            FunctionDeclaration(node) {
                if (!isNegatedVariableName(node.id.name)) {
                    return;
                }

                context.report({
                    node,
                    message,
                });
            },
            VariableDeclarator(node) {
                if (!isNegatedVariableName(node.id.name)) {
                    return;
                }

                context.report({
                    node,
                    message,
                });
            },
        }),
    },
};