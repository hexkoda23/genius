import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor
)

x, y, z, t, n = sp.symbols('x y z t n')

TRANSFORMATIONS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,   # ← this converts ^ to ** automatically
)

def clean(expression: str) -> str:
    """Clean and normalise the input expression."""
    return (expression
        .strip()
        .replace('pi', 'pi')
        .replace('√(', 'sqrt(')
        .replace('×', '*')
        .replace('÷', '/')
        .replace('−', '-')
    )

def solve_expression(expression: str) -> dict:
    try:
        expr_clean = clean(expression)

        if '=' in expr_clean:
            parts = expr_clean.split('=')
            left  = parse_expr(parts[0], transformations=TRANSFORMATIONS)
            right = parse_expr(parts[1], transformations=TRANSFORMATIONS)
            equation = sp.Eq(left, right)
            solution = sp.solve(equation, x)
            return {
                "type":     "equation",
                "input":    expression,
                "solution": str(solution),
                "latex":    "x = " + ", \\quad x = ".join(sp.latex(s) for s in solution) if solution else "\\text{No solution}",
                "steps":    f"Solved: {expression}  →  x = {', '.join(str(s) for s in solution)}"
            }

        parsed     = parse_expr(expr_clean, transformations=TRANSFORMATIONS)
        simplified = sp.simplify(parsed)
        numerical  = None
        try:
            numerical = float(simplified.evalf())
        except Exception:
            pass

        return {
            "type":       "expression",
            "input":      expression,
            "simplified": str(simplified),
            "numerical":  numerical,
            "latex":      sp.latex(simplified),
            "steps":      f"{expression}  →  {simplified}"
        }

    except Exception as e:
        return {
            "type":  "error",
            "input": expression,
            "error": f"Could not parse expression: {str(e)}"
        }


def differentiate(expression: str, variable: str = 'x') -> dict:
    try:
        var    = sp.Symbol(variable)
        parsed = parse_expr(clean(expression), transformations=TRANSFORMATIONS)
        deriv  = sp.diff(parsed, var)
        return {
            "type":     "derivative",
            "input":    expression,
            "variable": variable,
            "result":   str(deriv),
            "latex":    f"\\frac{{d}}{{d{variable}}}\\left({sp.latex(parsed)}\\right) = {sp.latex(deriv)}"
        }
    except Exception:
        return {
            "type": "error",
            "error": (
                f"Could not differentiate \u2018{expression}\u2019. "
                "Make sure you use standard notation (e.g. x^2, sin(x), e^x) "
                "and that x is your variable."
            )
        }


def integrate_expr(expression: str, variable: str = 'x') -> dict:
    try:
        var      = sp.Symbol(variable)
        parsed   = parse_expr(clean(expression), transformations=TRANSFORMATIONS)
        integral = sp.integrate(parsed, var)
        return {
            "type":     "integral",
            "input":    expression,
            "variable": variable,
            "result":   str(integral),
            "latex":    f"\\int {sp.latex(parsed)}\\, d{variable} = {sp.latex(integral)} + C"
        }
    except Exception:
        return {
            "type": "error",
            "error": (
                f"Could not integrate \u2018{expression}\u2019. "
                "Make sure you use standard notation (e.g. x^2, cos(x)) "
                "and that x is your variable."
            )
        }