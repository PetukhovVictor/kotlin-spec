#!/bin/env kscript

@file:MavenRepository("bintray-vorpal-research-kotlin-maven","https://dl.bintray.com/vorpal-research/kotlin-maven" )
@file:DependsOn("ru.spbstu:kotlin-pandoc:0.0.5")

import ru.spbstu.pandoc.*
import ru.spbstu.pandoc.helper.*

class IdCollector : PandocVisitor() {
    val blocks: MutableMap<String, Block> = mutableMapOf()
    val inlines: MutableMap<String, Inline> = mutableMapOf()

    override fun visit(b: Block): Block {
        if(b is Attributes && b.attr.id.isNotBlank()) blocks[b.attr.id] = b
        return super.visit(b)
    }

    override fun visit(i: Inline): Inline {
        if(i is Attributes && i.attr.id.isNotBlank()) inlines[i.attr.id] = i
        return super.visit(i)
    }
}

makeFilter(object : PandocVisitor() {
    val collector = IdCollector()
    var nextId: Int = 0

    override fun visit(doc: Pandoc): Pandoc {
        collector.visit(doc)
        return super.visit(doc)
    }

    fun getBlock(id: String): Block =
            when {
                id in collector.inlines -> {
                    val i = collector.inlines[id]!!
                    Block.Plain(listOf(i))
                }
                id in collector.blocks -> collector.blocks[id]!!
                else -> Block.Plain(listOf(Inline.Strong(listOf(Inline.Str("Id $id not found")))))
            }

    fun getInline(id: String): Inline =
            when {
                id in collector.inlines -> collector.inlines[id]!!
                id in collector.blocks ->
                    Inline.Strong(listOf(Inline.Str("[Cannot paste block $id as inline]")))
                else -> Inline.Strong(listOf(Inline.Str("[Id $id not found]")))
            }

    override fun visit(b: Block.Div): Block {
        when {
            "paste" in b.attr.classes -> {
                val props = b.attr.propertiesMap()
                val target = props["target"] ?: return super.visit(b)
                val block = getBlock(target)
                if(block is Attributes) {
                    val id = if(b.attr.id.isNotBlank()) b.attr.id else "$target-pasted-${nextId++}"
                    return block.copy(attr = block.attr.copy(id = id)) as Block
                }
                return block
            }
            else -> return super.visit(b)
        }
    }

    override fun visit(i: Inline.Span): Inline {
        when {
            "paste" in i.attr.classes -> {
                val props = i.attr.propertiesMap()
                val target = props["target"] ?: return super.visit(i)
                val inline = getInline(target)
                if(inline is Attributes) {
                    val id = if(i.attr.id.isNotBlank()) i.attr.id else "$target-pasted-${nextId++}"
                    return inline.copy(attr = inline.attr.copy(id = id)) as Inline
                }
                return inline
            }
            else -> return super.visit(i)
        }
    }

})
