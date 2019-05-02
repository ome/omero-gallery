
function getKeyValueAutoComplete(studies, key, inputText) {
  // Get values for key from each study
  let values = studies.map(study => {
    let v = getStudyValue(study, key);
    if (v) return v;
    console.log("No value found for study for key", key, study);
    return "";
  });
  // We want values that match inputText
  // Except for "Publication Authors", where we want words
  let matchCounts = values.reduce((prev, value) => {
    let matches = [];
    if (key == "Publication Authors") {
      let names = value.match(/\b(\w+)\b/g) || [];
      matches = names.filter(name => name.indexOf(inputText) > -1);
    } else if (value.indexOf(inputText) > -1) {
      matches.push(value);
    }
    matches.forEach(match => {
      if (!prev[match]) prev[match] = 0;
      prev[match]++;
    });

    return prev;
  }, {});

  return Object.keys(matchCounts);
}