package org.jetbrains.kotlin.grammar

import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import java.io.File
import org.jetbrains.kotlin.grammar.psi.PsiTextParser
import org.jetbrains.kotlin.grammar.parsetree.ParseTreeUtil
import org.jetbrains.kotlin.grammar.util.DiagnosticTestData
import org.jetbrains.kotlin.grammar.util.PsiTestData
import org.jetbrains.kotlin.grammar.util.TestUtil
import org.jetbrains.kotlin.grammar.util.TestUtil.assertEqualsToFile
import java.util.regex.Pattern

@RunWith(Parameterized::class)
class TestRunner {
    @Parameterized.Parameter
    lateinit var filename: String

    companion object {
        private const val ERROR_EXPECTED_MARKER = "WITH_ERRORS"
        private const val MUTE_MARKER = "MUTE"

        private val antlrTreeFileHeaderPattern =
                Pattern.compile("""^File: .*?.kts?(?<markers> \((?<marker>$ERROR_EXPECTED_MARKER|$MUTE_MARKER)\))?$""")

        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun getTestFiles() =
                File(TestUtil.TESTS_DIR).let { testsDir ->
                    testsDir.walkTopDown().filter { it.extension == "kt" }.map { arrayOf(it.relativeTo(testsDir).path) }.toList()
                }
    }

    @Test
    fun doTest() {
        val testFile = File(filename)
        val testData = TestUtil.getTestData(testFile)
        val marker = if (testData.antlrParseTreeText.exists())
                antlrTreeFileHeaderPattern.matcher(testData.antlrParseTreeText.readText().lines().first()).run {
                    if (find() && group("markers") != null) group("marker") else null
                }
            else null

        if (marker == MUTE_MARKER)
            return

        val (parseTree, errors) = ParseTreeUtil.parse(testData.sourceCode)
        val (lexerErrors, parserErrors) = errors
        val errorExpected = marker == ERROR_EXPECTED_MARKER
        val dumpParseTree = parseTree.stringifyTree("File: ${testFile.name}" + (if (errorExpected) " ($ERROR_EXPECTED_MARKER)" else ""))

        assertEqualsToFile("Expected and actual ANTLR parsetree are not equals.", testData.antlrParseTreeText, dumpParseTree)

        val lexerHasErrors = lexerErrors.isNotEmpty()
        val parserHasErrors = parserErrors.isNotEmpty()

        println("HAS ANTLR LEXER ERRORS: ${if (lexerHasErrors) "YES" else "NO"}")
        lexerErrors.forEach { println("    - $it") }
        println("HAS ANTLR PARSER ERRORS: ${if (parserHasErrors) "YES" else "NO"}")
        parserErrors.forEach { println("    - $it") }

        when (testData) {
            is PsiTestData -> {
                val psi = PsiTextParser.parse(testData.psiParseTreeText)
                val psiErrorElements = PsiTextParser.getErrorElements(psi)
                val psiHasErrorElements = psiErrorElements.isNotEmpty()
                val verdictsEquals = (lexerHasErrors || parserHasErrors) == psiHasErrorElements

                println("HAS PSI ERROR ELEMENTS: ${if (psiHasErrorElements) "YES" else "NO"}")
                psiErrorElements.forEach { println("    - Line ${it.second.first}:${it.second.second} ${it.first}") }
                assertTrue((verdictsEquals && !errorExpected) || (errorExpected && !psiHasErrorElements))
            }
            is DiagnosticTestData -> {
                val hasAnyErrors = lexerHasErrors || parserHasErrors
                assertTrue((!hasAnyErrors && !errorExpected) || errorExpected && hasAnyErrors)
            }
        }
    }
}
