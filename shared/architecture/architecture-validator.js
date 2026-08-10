export function analyzeCodeFiles(files) {
    const detectedRoutes = new Set();
    const detectedDatabases = new Set();
    const detectedExternalServices = new Set();
    const detectedTechnologies = new Set();
    const summaries = files.map((file) => {
        const imports = Array.from(file.content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g)).map((match) => match[1]);
        const routeMatches = Array.from(file.content.matchAll(/(?:app|router)\.(get|post|put|patch|delete)\(['"`]([^'"`]+)/gi));
        routeMatches.forEach((match) => detectedRoutes.add(`${match[1].toUpperCase()} ${match[2]}`));
        if (/pg|postgres|postgresql/i.test(file.content))
            detectedDatabases.add('PostgreSQL');
        if (/mongodb|mongoose/i.test(file.content))
            detectedDatabases.add('MongoDB');
        if (/stripe/i.test(file.content))
            detectedExternalServices.add('Stripe');
        if (/razorpay/i.test(file.content))
            detectedExternalServices.add('Razorpay');
        if (/express/i.test(file.content))
            detectedTechnologies.add('Express');
        if (/react/i.test(file.content))
            detectedTechnologies.add('React');
        return {
            path: file.path,
            imports,
            mentions: Array.from(new Set([...detectedDatabases, ...detectedExternalServices])),
        };
    });
    return {
        files: summaries,
        detectedTechnologies: Array.from(detectedTechnologies),
        detectedRoutes: Array.from(detectedRoutes),
        detectedDatabases: Array.from(detectedDatabases),
        detectedExternalServices: Array.from(detectedExternalServices),
    };
}
export function validateArchitecture(model, analysis) {
    const violations = [];
    for (const file of analysis.files) {
        const isController = /controller/i.test(file.path);
        const importsDb = file.imports.some((entry) => /pg|postgres|database|repository/i.test(entry));
        if (isController && importsDb) {
            violations.push({
                file: file.path,
                problem: 'Controller appears to import database/repository code directly.',
                expected: 'Controller -> service -> repository -> database',
                severity: 'High',
                suggestedFix: 'Move persistence access into the service/repository layer and keep controller orchestration thin.',
            });
        }
    }
    const approvedRoutes = new Set(model.nodes.flatMap((node) => node.apis.map((api) => `${api.method} ${api.path.replace(/\{([^}]+)\}/g, ':$1')}`)));
    for (const route of analysis.detectedRoutes) {
        if (!approvedRoutes.has(route)) {
            violations.push({
                file: 'route registry',
                problem: `Route ${route} is implemented but not present in the approved API contract.`,
                expected: 'Implemented routes should be generated from docs/api-spec.yaml.',
                severity: 'Medium',
                suggestedFix: 'Add the route to the architecture/API contract or remove the implementation.',
            });
        }
    }
    return violations;
}
export function detectDrift(model, analysis) {
    const drift = [];
    const approvedDb = model.database.engine.toLowerCase();
    for (const actual of analysis.detectedDatabases) {
        if (!approvedDb.includes(actual.toLowerCase())) {
            drift.push({ category: 'database', expected: model.database.engine, actual });
        }
    }
    const approvedExternal = model.externalDependencies.map((dep) => dep.name.toLowerCase()).join(' ');
    for (const actual of analysis.detectedExternalServices) {
        if (!approvedExternal.includes(actual.toLowerCase())) {
            drift.push({ category: 'external', expected: model.externalDependencies.map((dep) => dep.name).join(', ') || 'No external dependency', actual });
        }
    }
    return drift;
}
