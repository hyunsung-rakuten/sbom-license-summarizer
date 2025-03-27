# SBOM license summarizer

SBOM license summarizer is a Github-Action that collects SBOM-files from a list of provided repositories and summarizes and groups them by license.
The resulting JSON is provided as an output variable.

## Usage

example:

```yml
steps:
    - name: Summarise SVS-SBOMs
      id: summary
      uses: hpi-schul-cloud/sbom-summarizer@v1.0.0
      with:
          filename: dependencies.sbom.json
          repos: hpi-schul-cloud/tldraw-server:33.0.0;hpi-schul-cloud/schulcloud-client:33.0.0;hpi-schul-cloud/schulcloud-server:33.0.0

    - name: work with json
      run: echo '${{ toJson(steps.summary.outputs.json) }}'
```

## Integration in SVS-deployment workflow

```mermaid
---
config:
  look: handDrawn
  theme: neutral
---
flowchart TB
    subgraph 1
        direction LR
        A["Tag created"]
        AC@{ shape: braces, label: "in dof_app_deploy" }
    end

    subgraph 2
        direction LR
        B["GitHub action gets triggered"]
    end

    subgraph 3
        C["Fetch SBOMs of repos"]
        CC@{ shape: braces, label: "from Repos' Release Artifacts (SPDX)" }
    end

    subgraph sbom-license-summarizer
        D["Merge SBOMs into combined JSON format "]
        DC@{ shape: braces, label: "{ 'license': '', 'components': [ ... ] }" }
    end

    subgraph 5
        E["Upload JSON to S3"]
        EC@{ shape: braces, label: "at: svs-public-artifacts /<tag>/<instance>-license-summary.json" }
    end

    A-- when matching '[0-9]*' -->B;
    B-->C;
    C-->D;
    D-->E;

style 1 color:#fff,stroke:#fff,padding:0px,margin:0px
style 2 color:#fff,stroke:#fff,padding:0px,margin:0px
style 3 color:#fff,stroke:#fff,padding:0px,margin:0px
style sbom-license-summarizer color: #55f,stroke: #339
style 5 color:#fff,stroke:#fff,padding:0px,margin:0px
```

## Inputs

| name           | description                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| repos          | list of repositories separated by semicolon - each entry in the format `{ project }/{ repo }@{ version };{ project }/s ...` |
| filename       | name of the json-file containing the SBOM information in SPDX format in each repo                                           |
| outputFilename | name of the generated summarizing license JSON file                                                                         |

example:

```yml
with:
    filename: dependencies.sbom.json
    repos: hpi-schul-cloud/tldraw-server:33.0.0;hpi-schul-cloud/schulcloud-client:33.0.0;hpi-schul-cloud/schulcloud-server:33.0.0
```

## Outputs

The generated file containing the summarized list of all licenses and packages in the following format.
**_Hint_**: the file will be generated and written using the input-parameter `outputFilename`.

example:

```jsonc
{
  "Apache License 2.0": {
    "licenseText": "Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/\n\nTERMS AND CONDITIONS FOR USE, REPRODUC...",
    "components": [
      "@ampproject/remapping@2.3.0",
      "@eslint/config-array@0.18.0",
      ...
    ]
  },
  "Blue Oak Model License 1.0.0": {
    "licenseText": "# Blue Oak Model License\n\nVersion 1.0.0\n\n## Purpose\n\nThis license gives everyone as much permission to work with\nthis software as possible, while protecting contributors\nfrom liability....",
    "components": [
      "jackspeak@3.4.3",
      "package-json-from-dist@1.0.0",
      "path-scurry@1.11.1"
    ]
  },
  "BSD 2-Clause \"Simplified\" License": {
...
```

## Maintaining

When changing the code in this action, you need to run <code>npm run build</code> afterwards and need to push not only your changes - but also the generated /dist/index.js file.

This is necessary as the action is run directly without installing any dependencies. The build script bundles the action's sourcecode and the dependencies into a single javascript file, that is directly executable.

**_Hint_**

When trying to test the changes from within another github workflow, you need to keep in mind, that you have to adapt the action call by updating/replacing the version with the current commit SHA - in order to ensure that the newest version of the action will be executed.

```yml
steps:
    - name: Summarise SVS-SBOMs
      id: summary
      uses: hpi-schul-cloud/sbom-summarizer@1.0.0
```

becomes:

```yml
steps:
    - name: Summarise SVS-SBOMs
      id: summary
      uses: hpi-schul-cloud/sbom-summarizer@878e288f16f32be59bd19b12dd668a7874df7f06
```

After finishing the implementation it makes sense to tag a new version in this repo so that other workflows can directly address it:

```yml
uses: hpi-schul-cloud/sbom-summarizer@1.0.1
```
