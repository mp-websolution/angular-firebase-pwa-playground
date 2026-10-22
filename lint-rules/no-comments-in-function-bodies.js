const toolDirective = /^\s*(eslint-|eslint |@ts-|prettier-ignore|@vitest-environment)/;

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow comments inside function bodies: a behaviour belongs in a test name, a reason in the name of an extracted function (CODING_STANDARDS.md).',
    },
    schema: [],
    messages: {
      comment:
        'Move this comment out of the function body: name the step as a small function, or pin the behaviour with a test.',
    },
  },
  create(context) {
    const bodies = [];
    const rememberBody = (fn) => bodies.push(fn.body.range);
    return {
      FunctionDeclaration: rememberBody,
      FunctionExpression: rememberBody,
      ArrowFunctionExpression: rememberBody,
      'Program:exit'() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (toolDirective.test(comment.value)) continue;
          const [start, end] = comment.range;
          if (bodies.some(([from, to]) => from < start && end < to)) {
            context.report({ loc: comment.loc, messageId: 'comment' });
          }
        }
      },
    };
  },
};
