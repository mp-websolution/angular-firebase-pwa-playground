const toolDirective = /^\s*(eslint-|@ts-expect-error|@vitest-environment|prettier-ignore)/;

const functionTypes = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

function isWithin(inner, outer) {
  return outer[0] <= inner[0] && inner[1] <= outer[1];
}

function isInFunctionBody(sourceCode, comment) {
  for (let node = sourceCode.getNodeByRangeIndex(comment.range[0]); node; node = node.parent) {
    if (functionTypes.has(node.type) && isWithin(comment.range, node.body.range)) {
      return true;
    }
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow comments inside function bodies, apart from tool directives',
    },
    messages: {
      comment:
        'No comments inside function bodies: move the explanation into a test name or the name of an extracted function (CODING_STANDARDS.md "Comments and naming").',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      'Program:exit'() {
        for (const comment of sourceCode.getAllComments()) {
          if (!toolDirective.test(comment.value) && isInFunctionBody(sourceCode, comment)) {
            context.report({ loc: comment.loc, messageId: 'comment' });
          }
        }
      },
    };
  },
};
