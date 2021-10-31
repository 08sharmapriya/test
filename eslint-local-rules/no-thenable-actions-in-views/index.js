const _ = require('underscore');
const path = require('path');
const isReactViewFile = require('../utils').isReactViewFile;

const message = 'Calling .then() on action method {{method}} is forbidden in React views. Relocate this logic into the actions file and pass values via Onyx.';

module.exports = {
    message,
    rule: {
        create: (context) => {
            const actionsNamespaces = [];
            return {
                // Using import declaration to create a map of all the imports for this file and which ones are "actions"
                ImportDeclaration(node) {
                    const pathName = path.resolve(node.source.value);
                    if (!pathName.includes('/actions/')) {
                        return;
                    }

                    actionsNamespaces.push(_.last(pathName.split('/')));
                },
                MemberExpression(node) {
                    if (!isReactViewFile(context.getFilename())) {
                        return;
                    }

                    if (node.property.name !== 'then') {
                        return;
                    }

                    const actionModuleName = node.object.callee.object.name;
                    if (!_.includes(actionsNamespaces, actionModuleName)) {
                        return;
                    }

                    const actionMethodName = node.object.callee.property.name;
                    context.report({
                        node,
                        message,
                        data: {
                            method: `${actionModuleName}.${actionMethodName}()`,
                        },
                    });
                },
            };
        },
    },
};