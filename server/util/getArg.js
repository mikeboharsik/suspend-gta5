const argPattern = '{arg}=(.+)$';

function getArg(arg, d) {
  if (d) console.log({ arg });

  const pattern = new RegExp(argPattern.replace('{arg}', arg));
  if (d) console.log({ pattern });

  const args = process.argv;
  if (d) console.log({ args });

  for (arg of args) {
    const matches = arg.match(pattern);
    if (d) console.log(matches);
    if (matches) {
      return matches[1];
    }
  }

  return null;
}

module.exports = { getArg };
