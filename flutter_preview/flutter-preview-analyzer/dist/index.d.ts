declare class Analyzer {
    readonly text: string;
    constructor(text: string);
    widgets(): WidgetAnalysis[];
}
interface WidgetAnalysis {
    start: number;
    id: string;
    name: string;
    constructors: WidgetContructor[];
}
interface WidgetContructor {
    start: number;
    /**
     * if the constructor is default constructor, the name will match the class name (dart)
     */
    name: string;
    parameters: any[];
    analysis: {
        /**
         * rather if explicit arguments are required to be successfully instanciated, compiled.
         */
        requires_arguments: boolean;
    };
}

export { Analyzer };
