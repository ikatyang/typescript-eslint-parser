"use strict";

const fs = require("fs");
const path = require("path");
const glob = require("glob");
const parse = require("./parse");
const parseUtils = require("./utils");

/**
 * JSX fixtures which have known issues for typescript-eslint-parser
 */
const jsxFilesWithKnownIssues = require("../jsx-known-issues");

/**
 * Current random error difference on jsx/invalid-no-tag-name.src.js
 * TSEP - SyntaxError
 * Babylon - RangeError
 *
 * Reported here: https://github.com/babel/babylon/issues/674
 */
jsxFilesWithKnownIssues.push("jsx/invalid-no-tag-name");

/**
 * Utility to generate glob patterns for specific subsections of the fixtures/ directory,
 * including the capability to ignore specific nested patterns
 * @param {string} fixturesSubPath the sub-path within the fixtures/ directory
 * @param {Object?} config an optional configuration object with optional sub-paths to ignore
 * @returns {string} the glob pattern
 */
function createFixturePatternFor(fixturesSubPath, config) {
    if (!fixturesSubPath) {
        return "";
    }
    config = config || {};
    config.ignore = config.ignore || [];
    return `${fixturesSubPath}/!(${config.ignore.map(f => f.replace(`${fixturesSubPath}/`, "")).join("|")}).src.js`;
}

// Either a string of the pattern, or an object containing the pattern and some additional config
const fixturePatternsToTest = [
    createFixturePatternFor("basics"),

    createFixturePatternFor("comments", {
        ignore: [
            "comments/export-default-anonymous-class", // needs to be parsed with `sourceType: "module"`
            /**
             * Template strings seem to also be affected by the difference in opinion between different parsers in:
             * https://github.com/babel/babylon/issues/673
             */
            "comments/no-comment-template", // Purely AST diffs
            "comments/template-string-block" // Purely AST diffs
        ]
    }),

    createFixturePatternFor("ecma-features/templateStrings", {
        ignore: [
            "ecma-features/templateStrings/**/*"
        ]
    }),

    createFixturePatternFor("ecma-features/experimentalObjectRestSpread", {
        ignore: [
            /**
             * "ExperimentalSpreadProperty" in espree/typescript-eslint-parser vs "SpreadElement" in Babylon
             * comes up a lot in this section
             */
            "ecma-features/experimentalObjectRestSpread/**/*"
        ]
    }),

    createFixturePatternFor("ecma-features/arrowFunctions", {
        ignore: [
            /**
             * Expected babylon parse errors - all of these files below produce parse errors in espree
             * as well, but the TypeScript compiler is so forgiving during parsing that typescript-eslint-parser
             * does not actually error on them and will produce an AST.
             */
            "ecma-features/arrowFunctions/error-dup-params", // babylon parse errors
            "ecma-features/arrowFunctions/error-dup-params", // babylon parse errors
            "ecma-features/arrowFunctions/error-strict-dup-params", // babylon parse errors
            "ecma-features/arrowFunctions/error-strict-octal", // babylon parse errors
            "ecma-features/arrowFunctions/error-two-lines" // babylon parse errors
        ]
    }),

    createFixturePatternFor("ecma-features/binaryLiterals"),
    createFixturePatternFor("ecma-features/blockBindings"),

    createFixturePatternFor("ecma-features/classes", {
        ignore: [
            /**
             * super() is being used outside of constructor. Other parsers (e.g. espree, acorn) do not error on this.
             */
            "ecma-features/classes/class-one-method-super", // babylon parse errors
            /**
             * Expected babylon parse errors - all of these files below produce parse errors in espree
             * as well, but the TypeScript compiler is so forgiving during parsing that typescript-eslint-parser
             * does not actually error on them and will produce an AST.
             */
            "ecma-features/classes/invalid-class-declaration", // babylon parse errors
            "ecma-features/classes/invalid-class-setter-declaration" // babylon parse errors
        ]
    }),

    createFixturePatternFor("ecma-features/defaultParams"),

    createFixturePatternFor("ecma-features/destructuring", {
        ignore: [
            /**
             * Expected babylon parse errors - all of these files below produce parse errors in espree
             * as well, but the TypeScript compiler is so forgiving during parsing that typescript-eslint-parser
             * does not actually error on them and will produce an AST.
             */
            "ecma-features/destructuring/invalid-defaults-object-assign" // babylon parse errors
        ]
    }),

    createFixturePatternFor("ecma-features/destructuring-and-arrowFunctions"),
    createFixturePatternFor("ecma-features/destructuring-and-blockBindings"),
    createFixturePatternFor("ecma-features/destructuring-and-defaultParams"),
    createFixturePatternFor("ecma-features/destructuring-and-forOf"),

    createFixturePatternFor("ecma-features/destructuring-and-spread", {
        ignore: [
            /**
             * Expected babylon parse errors - all of these files below produce parse errors in espree
             * as well, but the TypeScript compiler is so forgiving during parsing that typescript-eslint-parser
             * does not actually error on them and will produce an AST.
             */
            "ecma-features/destructuring-and-spread/error-complex-destructured-spread-first" // babylon parse errors
        ]
    }),

    createFixturePatternFor("ecma-features/experimentalAsyncIteration"),
    createFixturePatternFor("ecma-features/experimentalDynamicImport"),
    createFixturePatternFor("ecma-features/exponentiationOperators"),

    createFixturePatternFor("ecma-features/forOf", {
        ignore: [
            /**
             * TypeScript, espree and acorn parse this fine - esprima, flow and babylon do not...
             */
            "ecma-features/forOf/for-of-with-function-initializer" // babylon parse errors
        ]
    }),

    createFixturePatternFor("ecma-features/generators"),
    createFixturePatternFor("ecma-features/globalReturn"),

    createFixturePatternFor("ecma-features/modules", {
        ignore: [
            /**
             * TypeScript, flow and babylon parse this fine - esprima, espree and acorn do not...
             */
            "ecma-features/modules/invalid-export-default", // typescript-eslint-parser parse errors
            /**
             * Expected babylon parse errors - all of these files below produce parse errors in espree
             * as well, but the TypeScript compiler is so forgiving during parsing that typescript-eslint-parser
             * does not actually error on them and will produce an AST.
             */
            "ecma-features/modules/invalid-export-named-default", // babylon parse errors
            "ecma-features/modules/invalid-import-default-module-specifier", // babylon parse errors
            "ecma-features/modules/invalid-import-module-specifier", // babylon parse errors
            /**
             * Deleting local variable in strict mode
             */
            "ecma-features/modules/error-delete", // babylon parse errors
            /**
             * 'with' in strict mode
             */
            "ecma-features/modules/error-strict", // babylon parse errors

            "ecma-features/modules/export-default-array", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-default-class", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-default-expression", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-default-function", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-default-named-class", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-default-named-function", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-default-number", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-default-object", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-default-value", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-from-batch", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-from-default", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-from-named-as-default", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-from-named-as-specifier", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-from-named-as-specifiers", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-from-specifier", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-from-specifiers", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-function", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-named-as-default", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-named-as-specifier", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-named-as-specifiers", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-named-class", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-named-empty", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-named-specifier", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-named-specifiers-comma", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-named-specifiers", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-var-anonymous-function", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-var-number", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/export-var", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-default-and-named-specifiers", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-default-and-namespace-specifiers", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-default-as", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-default", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-jquery", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-module", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-named-as-specifier", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-named-as-specifiers", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-named-empty", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-named-specifier", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-named-specifiers-comma", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-named-specifiers", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-namespace-specifier", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/import-null-as-nil", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/invalid-await", // needs to be parsed with `sourceType: "module"`
            "ecma-features/modules/invalid-class" // needs to be parsed with `sourceType: "module"`
        ]
    }),

    createFixturePatternFor("ecma-features/newTarget", {
        ignore: [
            /**
             * Expected babylon parse errors - all of these files below produce parse errors in espree
             * as well, but the TypeScript compiler is so forgiving during parsing that typescript-eslint-parser
             * does not actually error on them and will produce an AST.
             */
            "ecma-features/newTarget/invalid-new-target", // babylon parse errors
            "ecma-features/newTarget/invalid-unknown-property" // babylon parse errors
        ]
    }),

    createFixturePatternFor("ecma-features/objectLiteralComputedProperties"),

    createFixturePatternFor("ecma-features/objectLiteralDuplicateProperties", {
        ignore: [
            /**
             * Expected babylon parse errors - all of these files below produce parse errors in espree
             * as well, but the TypeScript compiler is so forgiving during parsing that typescript-eslint-parser
             * does not actually error on them and will produce an AST.
             */
            "ecma-features/objectLiteralDuplicateProperties/error-proto-property", // babylon parse errors
            "ecma-features/objectLiteralDuplicateProperties/error-proto-string-property" // babylon parse errors
        ]
    }),

    createFixturePatternFor("ecma-features/objectLiteralShorthandMethods"),
    createFixturePatternFor("ecma-features/objectLiteralShorthandProperties"),
    createFixturePatternFor("ecma-features/octalLiterals"),
    createFixturePatternFor("ecma-features/regex"),
    createFixturePatternFor("ecma-features/regexUFlag"),
    createFixturePatternFor("ecma-features/regexYFlag"),

    createFixturePatternFor("ecma-features/restParams", {
        ignore: [
            /**
             * Expected babylon parse errors - all of these files below produce parse errors in espree
             * as well, but the TypeScript compiler is so forgiving during parsing that typescript-eslint-parser
             * does not actually error on them and will produce an AST.
             */
            "ecma-features/restParams/error-no-default", // babylon parse errors
            "ecma-features/restParams/error-not-last" // babylon parse errors
        ]
    }),

    createFixturePatternFor("ecma-features/spread"),
    createFixturePatternFor("ecma-features/unicodeCodePointEscapes"),
    createFixturePatternFor("jsx", { ignore: jsxFilesWithKnownIssues }),
    createFixturePatternFor("jsx-useJSXTextNode"),

    /**
     * The TypeScript compiler gives us the "externalModuleIndicator" to allow typescript-eslint-parser do dynamically detect the "sourceType".
     * Babylon does not have an equivalent feature (although perhaps it might come in the future https://github.com/babel/babylon/issues/440),
     * so we have to specify the "sourceType" we want to use.
     *
     * By default we have configured babylon to use "script", but for the examples below we need "module".
     */
    {
        pattern: "comments/export-default-anonymous-class.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-default-array.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-default-class.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-default-expression.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-default-function.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-default-named-class.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-default-named-function.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-default-number.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-default-object.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-default-value.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-from-batch.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-from-default.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-from-named-as-default.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-from-named-as-specifier.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-from-named-as-specifiers.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-from-specifier.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-from-specifiers.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-function.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-named-as-default.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-named-as-specifier.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-named-as-specifiers.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-named-class.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-named-empty.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-named-specifier.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-named-specifiers-comma.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-named-specifiers.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-var-anonymous-function.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-var-number.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/export-var.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-default-and-named-specifiers.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-default-and-namespace-specifiers.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-default-as.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-default.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-jquery.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-module.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-named-as-specifier.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-named-as-specifiers.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-named-empty.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-named-specifier.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-named-specifiers-comma.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-named-specifiers.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-namespace-specifier.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/import-null-as-nil.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/invalid-await.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "ecma-features/modules/invalid-class.src.js",
        config: { babylonParserOptions: { sourceType: "module" } }
    },

    /* ================================================== */

    /**
     * TYPESCRIPT-SPECIFIC FILES
     */

    /**
     * No issues
     */
    "typescript/basics/async-function-expression.src.ts",
    "typescript/basics/async-function-with-var-declaration.src.ts",
    "typescript/basics/function-with-await.src.ts",
    "typescript/errorRecovery/class-extends-empty-implements.src.ts",
    "typescript/basics/const-enum.src.ts",
    "typescript/basics/class-with-readonly-property.src.ts",
    "typescript/expressions/call-expression-type-arguments.src.ts",
    "typescript/expressions/new-expression-type-arguments.src.ts",
    "typescript/basics/function-with-types.src.ts",
    "typescript/basics/non-null-assertion-operator.src.ts",
    "typescript/namespaces-and-modules/ambient-module-declaration-with-import.src.ts",
    "typescript/basics/class-with-accessibility-modifiers.src.ts",
    "typescript/basics/class-with-optional-computed-property.src.ts",
    "typescript/basics/object-with-escaped-properties.src.ts",
    "typescript/decorators/parameter-decorators/parameter-decorator-constructor.src.ts",
    "typescript/decorators/parameter-decorators/parameter-decorator-decorator-instance-member.src.ts",
    "typescript/decorators/parameter-decorators/parameter-decorator-decorator-static-member.src.ts",
    "typescript/decorators/parameter-decorators/parameter-decorator-instance-member.src.ts",
    "typescript/decorators/parameter-decorators/parameter-decorator-static-member.src.ts",
    "typescript/basics/function-with-object-type-with-optional-properties.src.ts",
    "typescript/basics/function-with-object-type-without-annotation.src.ts",
    "typescript/decorators/accessor-decorators/accessor-decorator-factory-instance-member.src.ts",
    "typescript/decorators/accessor-decorators/accessor-decorator-factory-static-member.src.ts",
    "typescript/decorators/accessor-decorators/accessor-decorator-instance-member.src.ts",
    "typescript/decorators/accessor-decorators/accessor-decorator-static-member.src.ts",
    "typescript/decorators/method-decorators/method-decorator-factory-instance-member.src.ts",
    "typescript/decorators/method-decorators/method-decorator-factory-static-member.src.ts",
    "typescript/decorators/method-decorators/method-decorator-instance-member.src.ts",
    "typescript/decorators/method-decorators/method-decorator-static-member.src.ts",
    "typescript/decorators/property-decorators/property-decorator-factory-instance-member.src.ts",
    "typescript/decorators/property-decorators/property-decorator-factory-static-member.src.ts",
    "typescript/decorators/property-decorators/property-decorator-instance-member.src.ts",
    "typescript/decorators/property-decorators/property-decorator-static-member.src.ts",
    "typescript/decorators/class-decorators/class-decorator-factory.src.ts",
    "typescript/decorators/class-decorators/class-decorator.src.ts",
    "typescript/babylon-convergence/type-parameters.src.ts",
    "typescript/babylon-convergence/type-parameter-whitespace-loc.src.ts",
    "typescript/basics/class-with-type-parameter-default.src.ts",
    "typescript/basics/class-with-type-parameter-underscore.src.ts",
    "typescript/basics/class-with-type-parameter.src.ts",
    "typescript/basics/function-with-type-parameters-that-have-comments.src.ts",
    "typescript/basics/function-with-type-parameters-with-constraint.src.ts",
    "typescript/basics/function-with-type-parameters.src.ts",
    "typescript/basics/type-parameters-comments.src.ts",
    "typescript/namespaces-and-modules/shorthand-ambient-module-declaration.src.ts",
    "typescript/basics/var-with-type.src.ts",
    "typescript/basics/class-with-extends-generic-multiple.src.ts",
    "typescript/basics/class-with-extends-generic.src.ts",
    "typescript/basics/nested-type-arguments.src.ts",
    "typescript/basics/null-and-undefined-type-annotations.src.ts",
    "typescript/basics/var-with-dotted-type.src.ts",
    "typescript/basics/variable-declaration-type-annotation-spacing.src.ts",
    "typescript/basics/class-with-generic-method-default.src.ts",
    "typescript/basics/class-with-generic-method.src.ts",
    "typescript/basics/type-guard.src.ts",
    "typescript/basics/never-type-param.src.ts",
    {
        pattern: "typescript/basics/export-named-enum.src.ts",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "typescript/basics/export-assignment.src.ts",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "typescript/basics/export-default-class-with-generic.src.ts",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "typescript/basics/export-default-class-with-multiple-generics.src.ts",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "typescript/basics/export-named-class-with-generic.src.ts",
        config: { babylonParserOptions: { sourceType: "module" } }
    },
    {
        pattern: "typescript/basics/export-named-class-with-multiple-generics.src.ts",
        config: { babylonParserOptions: { sourceType: "module" } }
    }

    /**
     * TypeScript-specific tests taken from "errorRecovery". Babylon is not being as forgiving as the TypeScript compiler here.
     */
    // "typescript/errorRecovery/class-empty-extends-implements.src.ts", // babylon parse errors
    // "typescript/errorRecovery/class-empty-extends.src.ts", // babylon parse errors
    // "typescript/errorRecovery/decorator-on-enum-declaration.src.ts", // babylon parse errors
    // "typescript/errorRecovery/interface-property-modifiers.src.ts", // babylon parse errors
    // "typescript/errorRecovery/enum-with-keywords.src.ts" // babylon parse errors

    /**
     * Other babylon parse errors relating to invalid syntax.
     */
    // "typescript/basics/abstract-class-with-abstract-constructor.src.ts", // babylon parse errors
    // "typescript/basics/class-with-export-parameter-properties.src.ts", // babylon parse errors
    // "typescript/basics/class-with-optional-methods.src.ts", // babylon parse errors
    // "typescript/basics/class-with-static-parameter-properties.src.ts", // babylon parse errors
    // "typescript/basics/interface-with-all-property-types.src.ts", // babylon parse errors
    // "typescript/basics/interface-with-construct-signature-with-parameter-accessibility.src.ts", // babylon parse errors

    /**
     * typescript-eslint-parser erroring, but babylon not.
     */
    // "typescript/basics/arrow-function-with-type-parameters.src.ts" // typescript-eslint-parser parse errors

    /* ================================================== */

    /**
     * TypeScript AST differences which need to be resolved
     */

    /**
     * Identified major AST differences
     */

    /**
     * Babylon: ClassDeclaration + abstract: true
     * tsep: TSAbstractClassDeclaration
     */
    // "typescript/basics/abstract-class-with-abstract-properties.src.ts",

    /**
     * Babylon: ClassProperty + abstract: true
     * tsep: TSAbstractClassProperty
     */
    // "typescript/basics/abstract-class-with-abstract-readonly-property.src.ts",

    /**
     * Babylon: TSExpressionWithTypeArguments
     * tsep: ClassImplements
     */
    // "typescript/basics/class-with-implements-generic-multiple.src.ts",
    // "typescript/basics/class-with-implements-generic.src.ts",
    // "typescript/basics/class-with-implements.src.ts",

    /**
     * Babylon: TSDeclareFunction + declare: true
     * tsep: DeclareFunction
     */
    // "typescript/basics/declare-function.src.ts",

    /**
     * Babylon: TSDeclareFunction
     * tsep: TSNamespaceFunctionDeclaration
     */
    // "typescript/namespaces-and-modules/declare-namespace-with-exported-function.src.ts",

    /**
     * Babylon: FunctionDeclaration
     * tsep: TSNamespaceFunctionDeclaration
     */
    // "typescript/namespaces-and-modules/module-with-default-exports.src.ts",

    /**
     * Other major AST differences (e.g. fundamentally different node types)
     */
    // "typescript/basics/class-with-mixin.src.ts",
    // "typescript/basics/function-with-types-assignation.src.ts",
    // "typescript/basics/interface-extends-multiple.src.ts",
    // "typescript/basics/interface-extends.src.ts",
    // "typescript/basics/interface-type-parameters.src.ts",
    // "typescript/basics/interface-with-extends-type-parameters.src.ts",
    // "typescript/basics/interface-with-generic.src.ts",
    // "typescript/basics/interface-with-jsdoc.src.ts",
    // "typescript/basics/interface-with-optional-properties.src.ts",
    // "typescript/basics/interface-without-type-annotation.src.ts",
    // "typescript/basics/type-alias-declaration-with-constrained-type-parameter.src.ts",
    // "typescript/basics/type-alias-declaration.src.ts",
    // "typescript/basics/type-alias-object-without-annotation.src.ts",
    // "typescript/basics/typed-this.src.ts",
    // "typescript/errorRecovery/interface-empty-extends.src.ts",
    // "typescript/basics/class-with-optional-properties.src.ts",
    // "typescript/basics/class-with-optional-property-undefined.src.ts",
    // "typescript/namespaces-and-modules/nested-internal-module.src.ts",
    // "typescript/basics/export-type-function-declaration.src.ts",
    // "typescript/basics/export-type-class-declaration.src.ts",
    // "typescript/basics/abstract-interface.src.ts",

    /**
     * tsep bug - Program.body[0].expression.left.properties[0].value.right is currently showing up
     * as `ArrayPattern`, babylon, acorn and espree say it should be `ArrayExpression`
     * TODO: Fix this
     */
    // "typescript/basics/destructuring-assignment.src.ts",

    /**
     * Babylon bug for optional or abstract methods?
     */
    // "typescript/basics/abstract-class-with-abstract-method.src.ts", // babylon parse errors
    // "typescript/basics/abstract-class-with-optional-method.src.ts", // babylon parse errors
    // "typescript/basics/declare-class-with-optional-method.src.ts", // babylon parse errors

    /**
     * Awaiting feedback on Babylon issue https://github.com/babel/babylon/issues/700
     */
    // "typescript/basics/class-with-private-parameter-properties.src.ts",
    // "typescript/basics/class-with-protected-parameter-properties.src.ts",
    // "typescript/basics/class-with-public-parameter-properties.src.ts",
    // "typescript/basics/class-with-readonly-parameter-properties.src.ts",
];

// Either a string of the pattern, or an object containing the pattern and some additional config
const fixturesToTest = [];
const fixturesDirPath = path.join(__dirname, "../fixtures");

fixturePatternsToTest.forEach(fixturePattern => {
    const globPattern = (typeof fixturePattern === "string") ? fixturePattern : fixturePattern.pattern;
    const matchingFixtures = glob.sync(`${fixturesDirPath}/${globPattern}`, {});
    matchingFixtures.forEach(filename => {
        if (typeof fixturePattern === "string") {
            fixturesToTest.push(filename);
        } else {
            fixturesToTest.push({
                filename,
                config: fixturePattern.config
            });
        }
    });
});

/* eslint-disable */
/**
 * Common predicates for Babylon AST preprocessing
 */
const always = () => true;
const ifNumber = (val) => typeof val === "number";
/* eslint-enable */

/**
 * - Babylon wraps the "Program" node in an extra "File" node, normalize this for simplicity for now...
 * - Remove "start" and "end" values from Babylon nodes to reduce unimportant noise in diffs ("loc" data will still be in
 * each final AST and compared).
 *
 * @param {Object} ast raw babylon AST
 * @returns {Object} processed babylon AST
 */
function preprocessBabylonAST(ast) {
    return parseUtils.omitDeep(ast.program, [
        {
            key: "start",
            // only remove the "start" number (not the "start" object within loc)
            predicate: ifNumber
        },
        {
            key: "end",
            // only remove the "end" number (not the "end" object within loc)
            predicate: ifNumber
        },
        {
            key: "identifierName",
            predicate: always
        },
        {
            key: "extra",
            predicate: always
        },
        {
            key: "directives",
            predicate: always
        },
        {
            key: "directive",
            predicate: always
        },
        {
            key: "innerComments",
            predicate: always
        },
        {
            key: "leadingComments",
            predicate: always
        },
        {
            key: "trailingComments",
            predicate: always
        },
        {
            key: "guardedHandlers",
            predicate: always
        }
    ]);
}

/**
 * There is currently a really awkward difference in location data for Program nodes
 * between different parsers in the ecosystem. Hack around this by removing the data
 * before comparing the ASTs.
 *
 * See: https://github.com/babel/babylon/issues/673
 *
 * @param {Object} ast the raw AST with a Program node at its top level
 * @returns {Object} the ast with the location data removed from the Program node
 */
function removeLocationDataFromProgramNode(ast) {
    delete ast.loc;
    delete ast.range;
    return ast;
}

fixturesToTest.forEach(fixture => {

    const filename = (typeof fixture === "string") ? fixture : fixture.filename;
    const source = fs.readFileSync(filename, "utf8").replace(/\r\n/g, "\n");

    /**
     * Parse with typescript-eslint-parser
     */
    const typeScriptESLintParserResult = parse(source, {
        parser: "typescript-eslint-parser",
        typeScriptESLintParserOptions: (fixture.config && fixture.config.typeScriptESLintParserOptions) ? fixture.config.typeScriptESLintParserOptions : null
    });

    /**
     * Parse the source with babylon typescript-plugin
     */
    const babylonTypeScriptPluginResult = parse(source, {
        parser: "babylon-plugin-typescript",
        babylonParserOptions: (fixture.config && fixture.config.babylonParserOptions) ? fixture.config.babylonParserOptions : null
    });

    /**
     * If babylon fails to parse the source, ensure that typescript-eslint-parser has the same fundamental issue
     */
    if (babylonTypeScriptPluginResult.parseError) {
        /**
         * FAIL: babylon errored but typescript-eslint-parser did not
         */
        if (!typeScriptESLintParserResult.parseError) {
            test(`TEST FAIL [BABYLON ERRORED, BUT TSEP DID NOT] - ${filename}`, () => {
                expect(typeScriptESLintParserResult.parseError).toEqual(babylonTypeScriptPluginResult.parseError);
            });
            return;
        }
        /**
         * Both parsers errored - this is OK as long as the errors are of the same "type"
         */
        test(`[Both parsers error as expected] - ${filename}`, () => {
            expect(babylonTypeScriptPluginResult.parseError.name).toEqual(typeScriptESLintParserResult.parseError.name);
        });
        return;
    }

    /**
     * FAIL: typescript-eslint-parser errored but babylon did not
     */
    if (typeScriptESLintParserResult.parseError) {
        test(`TEST FAIL [TSEP ERRORED, BUT BABYLON DID NOT] - ${filename}`, () => {
            expect(babylonTypeScriptPluginResult.parseError).toEqual(typeScriptESLintParserResult.parseError);
        });
        return;
    }

    /**
     * No errors, assert the two ASTs match
     */
    test(`${filename}`, () => {
        expect(babylonTypeScriptPluginResult.ast).toBeTruthy();
        expect(typeScriptESLintParserResult.ast).toBeTruthy();
        /**
         * Perform some extra formatting steps on the babylon AST before comparing
         */
        expect(
            removeLocationDataFromProgramNode(
                preprocessBabylonAST(babylonTypeScriptPluginResult.ast)
            )
        ).toEqual(
            removeLocationDataFromProgramNode(typeScriptESLintParserResult.ast)
        );
    });

});
