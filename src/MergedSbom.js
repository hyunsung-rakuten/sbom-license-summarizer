import spdxLicenseList from "spdx-license-list/full.js";
import core from "@actions/core";

const SEPARATOR = /(\s+OR\s+|\s+AND\s+|\/)/gim;
const ONLY_A_SEPARATOR = /^(\s+OR\s+|\s+AND\s+|\/)$/gim;

export default class MergedSbom {
    mergedSbom = new Map();

    constructor(bomList) {
        bomList.forEach((bom) => {
            this.addBom(bom);
        });
    }

    getLicenseNames() {
        return [...this.mergedSbom.keys()];
    }

    getLicenseData(licenseName) {
        return this.mergedSbom.get(licenseName);
    }

    addBom(bom) {
        const noGithubActions = (e) => !/^pkg:githubaction/.test(e.referenceLocator);
        const someValidRefs = (p) => p.externalRefs.filter(noGithubActions).length > 0;

        const packages = bom.packages?.filter(someValidRefs) ?? [];
        packages.forEach((p) => {
            const licenseKey = p.licenseConcluded ?? p.licenseDeclared;
            if (licenseKey === undefined) {
                core.warning(`No license concluded/declared for ${p.name}@${p.versionInfo}`);
                return;
            }
            this.addSbomEntry(licenseKey, p.name, p.versionInfo);
        });
    }

    toString() {
        const licenseList = this.getLicenseList();
        return JSON.stringify(licenseList, null, 2);
    }

    isEmpty() {
        return this.mergedSbom.keys().length === 0;
    }

    getLicenseList() {
        const licenseNames = this.getLicenseNames();
        licenseNames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        const result = {};
        for (const licenseName of licenseNames) {
            const licenseData = this.getLicenseData(licenseName);
            if (!licenseData) {
                continue;
            }
            const { licenseText, packages: components } = licenseData;
            const sortedComponents = [...components].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            result[licenseName] = { licenseText, components: sortedComponents };
        }
        return result;
    }

    addSbomEntry(licenseKey, name, version) {
        const cleansedLicenseKey = this.cleanLicenseKey(licenseKey);

        if (ONLY_A_SEPARATOR.test(cleansedLicenseKey)) {
            return;
        }

        if (this.isSingleLicenseKey(cleansedLicenseKey)) {
            this.addPackageToLicense(cleansedLicenseKey, name, version);
            return;
        }

        const licenseParts = this.splitLicenseString(cleansedLicenseKey);

        licenseParts.forEach((licensePart) => {
            if (licenseKey !== licensePart) {
                this.addSbomEntry(licensePart, name, version);
            }
        });
        return;
    }

    isSingleLicenseKey(licenseKey) {
        return !SEPARATOR.test(licenseKey);
    }

    addPackageToLicense(licenseKey, name, version) {
        const license = spdxLicenseList[licenseKey];
        if (/^LicenseRef-scancode-/.test(licenseKey)) {
            core.info(`ignoring license '${licenseKey}' for ${name}@${version}`);
            return;
        }
        if (license === undefined) {
            core.warning(`License definition not found for: '${licenseKey}' of ${name}@${version}`);
            return;
        }
        const licenseName = license?.name ?? licenseKey;
        const licenseText = license?.licenseText;
        const content = this.mergedSbom.get(licenseName) ?? { licenseName, licenseText, packages: new Set() };
        content.packages.add(`${name}@${version}`);
        this.mergedSbom.set(licenseName, content);
    }

    cleanLicenseKey(licenseKey) {
        const cleansedLicenseKey = licenseKey
            .replace(/[()]+/gim, "")
            .replace(/^Apache2$/, "Apache-2.0")
            .replace(/^X-11$/, "X11")
            .replace(/^Public-Domain$/, "Public Domain");
        return cleansedLicenseKey;
    }

    splitLicenseString(licenseKey) {
        const licenseParts = licenseKey.split(SEPARATOR);
        return licenseParts;
    }
}
