"Sort json key"
import json

with open("snippets.json", 'r') as input_file:
    JSON_DATA = json.load(input_file)
    with open("snippets.json", "w") as output_file:
        output_file.write(json.dumps(JSON_DATA, indent=4, sort_keys=True))
