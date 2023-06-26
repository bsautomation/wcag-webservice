# Wcag Webservice
---

### Note - Application code has been moved to qa-components repo - https://github.com/browserstack/qa-components/tree/main/wcag-webservice

## Setup

In order to run Pa11y Webservice, we recommend cloning this repository locally:

```sh
git clone https://github.com/bsautomation/wcag-webservice.git
```

Then installing the dependencies:

```sh
cd wcag-webservice
yarn install
npm start
```

The `config/` directory contains three example config files. You can use these as a base to create your own configuration.

```sh
cp config/development.sample.json config/development.json
cp config/production.sample.json config/production.json
cp config/test.sample.json config/test.json
```

[info-license]: LICENSE
