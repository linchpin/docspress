<?php
/**
 * Diagram block registration and rendering.
 *
 * @package DocsPressBlocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Parse the compact diagram source.
 *
 * One relationship per line: Source -> Target: optional label. The label
 * separator is a lone colon, so a `Class::method` target stays one actor.
 *
 * @param string $source Diagram source.
 * @return array
 */
function docspress_blocks_parse_diagram( $source ) {
	$actors = array();
	$edges  = array();
	$source = docspress_blocks_decode_source( $source );
	$lines  = preg_split( '/\r\n|\r|\n/', $source );

	foreach ( array_slice( $lines, 0, 30 ) as $line ) {
		$line = trim( $line );
		if ( '' === $line || 0 === strpos( $line, '#' ) ) {
			continue;
		}
		if ( ! preg_match( '/^(.+?)\s*(?:-->|->)\s*(.+?)(?:\s*(?<!:):(?!:)\s*(.+))?$/u', $line, $matches ) ) {
			continue;
		}
		$from  = sanitize_text_field( trim( $matches[1] ) );
		$to    = sanitize_text_field( trim( $matches[2] ) );
		$label = isset( $matches[3] ) ? sanitize_text_field( trim( $matches[3] ) ) : '';
		if ( '' === $from || '' === $to ) {
			continue;
		}
		foreach ( array( $from, $to ) as $actor ) {
			if ( ! in_array( $actor, $actors, true ) && count( $actors ) < 8 ) {
				$actors[] = $actor;
			}
		}
		if ( in_array( $from, $actors, true ) && in_array( $to, $actors, true ) ) {
			$edges[] = array(
				'from'  => $from,
				'to'    => $to,
				'label' => $label,
			);
		}
	}

	return array(
		'actors' => $actors,
		'edges'  => array_slice( $edges, 0, 24 ),
	);
}

/**
 * Truncate an SVG label while retaining the full value in accessible text.
 *
 * @param string $label Label.
 * @param int    $limit Limit.
 * @return string
 */
function docspress_blocks_diagram_label( $label, $limit = 22 ) {
	if ( function_exists( 'mb_strlen' ) && mb_strlen( $label ) > $limit ) {
		return mb_substr( $label, 0, $limit - 1 ) . '…';
	}
	if ( strlen( $label ) > $limit ) {
		return substr( $label, 0, $limit - 1 ) . '…';
	}
	return $label;
}

/**
 * Estimate the rendered width of diagram text.
 *
 * SVG text cannot be measured on the server, so this sums per-character widths
 * measured at weight 680 and rounded up to the widest of system UI and the
 * theme fonts: a box sized from it holds its label in either.
 *
 * @param string $text Text.
 * @param float  $size Font size in pixels.
 * @return float
 */
function docspress_blocks_diagram_text_width( $text, $size ) {
	$em = 0;
	foreach ( preg_split( '//u', (string) $text, -1, PREG_SPLIT_NO_EMPTY ) as $char ) {
		if ( false !== strpos( "iljI.,:;|!'`", $char ) ) {
			$em += 0.3;
		} elseif ( false !== strpos( 'frt()[]{}/\\- ', $char ) ) {
			$em += 0.4;
		} elseif ( false !== strpos( 'mwMW', $char ) ) {
			$em += 0.88;
		} elseif ( preg_match( '/[A-Z0-9#%&@]/', $char ) ) {
			$em += 0.68;
		} else {
			$em += strlen( $char ) > 1 ? 0.9 : 0.6;
		}
	}
	return $em * $size;
}

/**
 * Shorten text until its estimated width fits, keeping the start.
 *
 * @param string $text      Text.
 * @param float  $max_width Width available in pixels.
 * @param float  $size      Font size in pixels.
 * @return string
 */
function docspress_blocks_diagram_fit( $text, $max_width, $size ) {
	if ( docspress_blocks_diagram_text_width( $text, $size ) <= $max_width ) {
		return $text;
	}
	$chars = preg_split( '//u', $text, -1, PREG_SPLIT_NO_EMPTY );
	for ( $length = count( $chars ) - 1; $length > 1; $length-- ) {
		$short = rtrim( implode( '', array_slice( $chars, 0, $length ) ) ) . '…';
		if ( docspress_blocks_diagram_text_width( $short, $size ) <= $max_width ) {
			return $short;
		}
	}
	return $chars[0] . '…';
}

/**
 * Break an edge label onto two lines when it is long.
 *
 * A long label on one line widens its gap, and every gap widens the whole
 * diagram, which then scales down until nothing in it is legible.
 *
 * @param string $label Label.
 * @return string[]
 */
function docspress_blocks_diagram_label_lines( $label ) {
	$label = trim( preg_replace( '/\s+/u', ' ', $label ) );
	$words = explode( ' ', $label );
	if ( mb_strlen( $label ) <= 18 || count( $words ) < 2 ) {
		return array( docspress_blocks_diagram_label( $label, 26 ) );
	}
	$best  = 1;
	$total = count( $words );
	for ( $split = 1; $split < $total; $split++ ) {
		$longest = max( mb_strlen( implode( ' ', array_slice( $words, 0, $split ) ) ), mb_strlen( implode( ' ', array_slice( $words, $split ) ) ) );
		$current = max( mb_strlen( implode( ' ', array_slice( $words, 0, $best ) ) ), mb_strlen( implode( ' ', array_slice( $words, $best ) ) ) );
		if ( $longest < $current ) {
			$best = $split;
		}
	}
	return array(
		docspress_blocks_diagram_label( implode( ' ', array_slice( $words, 0, $best ) ), 22 ),
		docspress_blocks_diagram_label( implode( ' ', array_slice( $words, $best ) ), 22 ),
	);
}

/**
 * Place values in order, at least a gap apart, as close to where they want to be as possible.
 *
 * Subtracting each value's share of the spacing turns this into fitting a
 * non-decreasing sequence, which pooling adjacent violators solves exactly.
 *
 * @param float[] $want Preferred positions, in their required order.
 * @param float   $gap  Minimum distance between neighbours.
 * @return float[]
 */
function docspress_blocks_diagram_spread( $want, $gap ) {
	$blocks = array();
	foreach ( array_values( $want ) as $i => $value ) {
		$blocks[] = array( $value - ( $i * $gap ), 1 );
		// Merge the last two blocks while the later one sits above the earlier.
		for ( $n = count( $blocks ); $n > 1; $n-- ) {
			$last = $blocks[ $n - 1 ];
			$prev = $blocks[ $n - 2 ];
			if ( $prev[0] / $prev[1] <= $last[0] / $last[1] ) {
				break;
			}
			array_splice( $blocks, -2, 2, array( array( $prev[0] + $last[0], $prev[1] + $last[1] ) ) );
		}
	}
	$placed = array();
	foreach ( $blocks as $block ) {
		for ( $k = 0; $k < $block[1]; $k++ ) {
			$placed[] = ( $block[0] / $block[1] ) + ( count( $placed ) * $gap );
		}
	}
	return $placed;
}

/**
 * Count edge crossings between each pair of neighbouring columns.
 *
 * @param array $layers Item IDs per column, in order.
 * @param array $down   Item IDs each item links to in the next column.
 * @return int
 */
function docspress_blocks_diagram_crossings( $layers, $down ) {
	$crossings = 0;
	$last_rank = count( $layers ) - 1;
	for ( $rank = 0; $rank < $last_rank; $rank++ ) {
		$next     = array_flip( $layers[ $rank + 1 ] );
		$segments = array();
		foreach ( $layers[ $rank ] as $position => $item ) {
			foreach ( $down[ $item ] as $target ) {
				$segments[] = array( $position, $next[ $target ] );
			}
		}
		$total = count( $segments );
		foreach ( $segments as $i => $a ) {
			for ( $j = $i + 1; $j < $total; $j++ ) {
				$b = $segments[ $j ];
				if ( ( $a[0] - $b[0] ) * ( $a[1] - $b[1] ) < 0 ) {
					++$crossings;
				}
			}
		}
	}
	return $crossings;
}

/**
 * Lay out a flow diagram as columns of actors, left to right.
 *
 * Actors are ranked so every relationship points into a later column, with
 * cycles drawn as a reversed arrow. An edge that spans columns passes through
 * a placeholder in each, so it runs around the actors it skips instead of
 * behind them. Each column is ordered to cut crossings, then each row is drawn
 * toward its neighbours so lines run straight wherever the order allows.
 * Disconnected groups get a band each.
 *
 * Every label sits on a straight run of its own line: an actor that fans out
 * turns its lines at the source, a fan-in turns them at the target, and so
 * labels line up with rows rather than piling up where the lines converge.
 *
 * @param array $diagram Parsed diagram.
 * @return array Width, height, nodes, edges, labels and loops, in SVG units.
 */
function docspress_blocks_layout_flow_diagram( $diagram ) {
	$pad       = 12;
	$node_h    = 40;
	$node_pad  = 14;
	$pitch     = 60;
	$band_gap  = 24;
	$loop_room = 40;
	$turn      = 40;
	$arrow     = 10;
	$label_pad = 8;
	$min_gap   = 56;
	$font      = 12;
	$mono_char = 6.1;
	$line_h    = 12;

	$actors = array_values( $diagram['actors'] );
	$count  = count( $actors );
	$index  = array_flip( $actors );
	$edges  = array();
	$loops  = array();

	foreach ( $diagram['edges'] as $edge ) {
		$from = $index[ $edge['from'] ];
		$to   = $index[ $edge['to'] ];
		if ( $from === $to ) {
			$loops[] = array(
				'node'  => $from,
				'label' => $edge['label'],
			);
			continue;
		}
		$edges[] = array(
			'from'     => $from,
			'to'       => $to,
			'label'    => $edge['label'],
			'reversed' => false,
		);
	}

	if ( 0 === $count ) {
		return array(
			'width'  => 240,
			'height' => $node_h + ( 2 * $pad ),
			'nodes'  => array(),
			'edges'  => array(),
			'labels' => array(),
			'loops'  => array(),
		);
	}

	// Reverse the edges a depth-first walk finds pointing back up its own path.
	$out   = array_fill( 0, $count, array() );
	$state = array_fill( 0, $count, 0 );
	foreach ( $edges as $id => $edge ) {
		$out[ $edge['from'] ][] = $id;
	}
	$visit = function ( $node ) use ( &$visit, &$state, &$edges, $out ) {
		$state[ $node ] = 1;
		foreach ( $out[ $node ] as $id ) {
			$next = $edges[ $id ]['to'];
			if ( 1 === $state[ $next ] ) {
				$edges[ $id ]['reversed'] = true;
			} elseif ( 0 === $state[ $next ] ) {
				$visit( $next );
			}
		}
		$state[ $node ] = 2;
	};
	for ( $node = 0; $node < $count; $node++ ) {
		if ( 0 === $state[ $node ] ) {
			$visit( $node );
		}
	}

	$preds = array_fill( 0, $count, array() );
	$succs = array_fill( 0, $count, array() );
	foreach ( $edges as $id => $edge ) {
		$edges[ $id ]['tail']             = $edge['reversed'] ? $edge['to'] : $edge['from'];
		$edges[ $id ]['head']             = $edge['reversed'] ? $edge['from'] : $edge['to'];
		$succs[ $edges[ $id ]['tail'] ][] = $edges[ $id ]['head'];
		$preds[ $edges[ $id ]['head'] ][] = $edges[ $id ]['tail'];
	}

	// Rank by longest path, then pull each source up beside its nearest target.
	$waiting = array_map( 'count', $preds );
	$queue   = array_keys(
		array_filter(
			$waiting,
			static function ( $n ) {
				return 0 === $n;
			}
		)
	);
	$order   = array();
	while ( $queue ) {
		$node    = array_shift( $queue );
		$order[] = $node;
		foreach ( $succs[ $node ] as $next ) {
			if ( 0 === --$waiting[ $next ] ) {
				$queue[] = $next;
			}
		}
	}
	$rank = array_fill( 0, $count, 0 );
	foreach ( $order as $node ) {
		foreach ( $succs[ $node ] as $next ) {
			$rank[ $next ] = max( $rank[ $next ], $rank[ $node ] + 1 );
		}
	}
	foreach ( array_reverse( $order ) as $node ) {
		if ( ! $preds[ $node ] && $succs[ $node ] ) {
			$rank[ $node ] = min( array_intersect_key( $rank, array_flip( $succs[ $node ] ) ) ) - 1;
		}
	}

	// Group connected actors, numbered by first appearance, each starting at the left.
	$root = range( 0, $count - 1 );
	$find = function ( $node ) use ( &$root, &$find ) {
		if ( $root[ $node ] !== $node ) {
			$root[ $node ] = $find( $root[ $node ] );
		}
		return $root[ $node ];
	};
	foreach ( $edges as $edge ) {
		$a = $find( $edge['tail'] );
		$b = $find( $edge['head'] );
		if ( $a !== $b ) {
			$root[ max( $a, $b ) ] = min( $a, $b );
		}
	}
	$group  = array();
	$groups = array();
	for ( $node = 0; $node < $count; $node++ ) {
		$first = $find( $node );
		if ( ! isset( $groups[ $first ] ) ) {
			$groups[ $first ] = count( $groups );
		}
		$group[ $node ] = $groups[ $first ];
	}
	$lowest = array();
	foreach ( $group as $node => $g ) {
		$lowest[ $g ] = isset( $lowest[ $g ] ) ? min( $lowest[ $g ], $rank[ $node ] ) : $rank[ $node ];
	}
	foreach ( $group as $node => $g ) {
		$rank[ $node ] -= $lowest[ $g ];
	}

	// Actors are items 0..count-1; an edge that skips columns adds a placeholder item in each.
	$items = array();
	for ( $node = 0; $node < $count; $node++ ) {
		$items[] = array(
			'node'  => $node,
			'rank'  => $rank[ $node ],
			'group' => $group[ $node ],
			'key'   => $node,
		);
	}
	foreach ( $edges as $id => $edge ) {
		$chain = array( $edge['tail'] );
		for ( $r = $rank[ $edge['tail'] ] + 1; $r < $rank[ $edge['head'] ]; $r++ ) {
			$items[] = array(
				'node'  => null,
				'rank'  => $r,
				'group' => $group[ $edge['tail'] ],
				'key'   => $edge['tail'] + 0.5,
				'edge'  => $id,
			);
			$chain[] = count( $items ) - 1;
		}
		$chain[]               = $edge['head'];
		$edges[ $id ]['chain'] = $chain;
	}
	$up   = array_fill( 0, count( $items ), array() );
	$down = array_fill( 0, count( $items ), array() );
	foreach ( $edges as $edge ) {
		$links = count( $edge['chain'] ) - 1;
		for ( $i = 0; $i < $links; $i++ ) {
			$down[ $edge['chain'][ $i ] ][]   = $edge['chain'][ $i + 1 ];
			$up[ $edge['chain'][ $i + 1 ] ][] = $edge['chain'][ $i ];
		}
	}

	$columns = 1 + max( array_column( $items, 'rank' ) );
	$layers  = array_fill( 0, $columns, array() );
	foreach ( $items as $id => $item ) {
		$layers[ $item['rank'] ][] = $id;
	}
	$sort = function ( &$layer, $weight ) use ( $items ) {
		usort(
			$layer,
			static function ( $a, $b ) use ( $items, $weight ) {
				return array( $items[ $a ]['group'], $weight[ $a ], $items[ $a ]['key'], $a ) <=> array( $items[ $b ]['group'], $weight[ $b ], $items[ $b ]['key'], $b );
			}
		);
	};
	foreach ( $layers as $r => $layer ) {
		$sort( $layers[ $r ], array_fill_keys( $layer, 0 ) );
	}

	// Order each column by the mean position of its links, sweeping both ways; keep the best.
	$best      = $layers;
	$best_miss = docspress_blocks_diagram_crossings( $layers, $down );
	for ( $pass = 0; $pass < 8 && $best_miss > 0 && $columns > 1; $pass++ ) {
		$downward = 0 === $pass % 2;
		$ranks    = $downward ? range( 1, $columns - 1 ) : range( $columns - 2, 0 );
		foreach ( $ranks as $r ) {
			$links    = $downward ? $up : $down;
			$position = array_flip( $layers[ $downward ? $r - 1 : $r + 1 ] );
			$weight   = array();
			foreach ( $layers[ $r ] as $i => $item ) {
				$weight[ $item ] = $i;
				if ( $links[ $item ] ) {
					$weight[ $item ] = array_sum( array_intersect_key( $position, array_flip( $links[ $item ] ) ) ) / count( array_unique( $links[ $item ] ) );
				}
			}
			$sort( $layers[ $r ], $weight );
		}
		$miss = docspress_blocks_diagram_crossings( $layers, $down );
		if ( $miss < $best_miss ) {
			$best      = $layers;
			$best_miss = $miss;
		}
	}
	$layers = $best;

	// Rows: start centred, then draw each item toward the mean of its links, a pitch apart.
	$y           = array();
	$band_top    = $pad;
	$group_count = count( $groups );
	for ( $g = 0; $g < $group_count; $g++ ) {
		$rows = array();
		foreach ( $layers as $r => $layer ) {
			$rows[ $r ] = array_values(
				array_filter(
					$layer,
					static function ( $item ) use ( $items, $g ) {
						return $items[ $item ]['group'] === $g;
					}
				)
			);
		}
		$tallest = max( array_map( 'count', $rows ) );
		foreach ( $rows as $row ) {
			foreach ( $row as $i => $item ) {
				$y[ $item ] = ( $i + ( ( $tallest - count( $row ) ) / 2 ) ) * $pitch;
			}
		}
		for ( $pass = 0; $pass < 4; $pass++ ) {
			$downward = 0 === $pass % 2;
			$links    = $downward ? $up : $down;
			$ranks    = $downward ? range( 1, $columns - 1 ) : range( $columns - 2, 0 );
			foreach ( $columns > 1 ? $ranks : array() as $r ) {
				if ( ! $rows[ $r ] ) {
					continue;
				}
				$want = array();
				foreach ( $rows[ $r ] as $item ) {
					$want[] = $links[ $item ] ? array_sum( array_intersect_key( $y, array_flip( $links[ $item ] ) ) ) / count( array_unique( $links[ $item ] ) ) : $y[ $item ];
				}
				foreach ( docspress_blocks_diagram_spread( $want, $pitch ) as $i => $value ) {
					$y[ $rows[ $r ][ $i ] ] = $value;
				}
			}
		}
		$members = array_merge( ...array_values( $rows ) );
		$values  = array_intersect_key( $y, array_flip( $members ) );
		$room    = in_array( $g, array_intersect_key( $group, array_flip( array_column( $loops, 'node' ) ) ), true ) ? $loop_room : 0;
		$shift   = $band_top + $room + ( $node_h / 2 ) - min( $values );
		foreach ( $members as $item ) {
			$y[ $item ] += $shift;
		}
		$band_top += $room + ( max( $values ) - min( $values ) ) + $node_h + $band_gap;
	}
	$height = $band_top - $band_gap + $pad;

	// Parallel edges between the same pair would overlap exactly; fan their ends apart.
	$pairs = array();
	foreach ( $edges as $id => $edge ) {
		$pairs[ $edge['tail'] . '>' . $edge['head'] ][] = $id;
	}
	foreach ( $pairs as $ids ) {
		foreach ( $ids as $i => $id ) {
			$edges[ $id ]['offset'] = ( $i - ( ( count( $ids ) - 1 ) / 2 ) ) * 10;
		}
	}
	$fan_out = array_count_values( array_column( $edges, 'tail' ) );
	$fan_in  = array_count_values( array_column( $edges, 'head' ) );

	// Widths: an actor's box fits its name; a column fits its widest box or placeholder label.
	$col_w = array_fill( 0, $columns, 88 );
	$names = array();
	for ( $node = 0; $node < $count; $node++ ) {
		$names[ $node ]          = docspress_blocks_diagram_fit( $actors[ $node ], 220 - ( 2 * $node_pad ), $font );
		$width                   = docspress_blocks_diagram_text_width( $names[ $node ], $font ) + ( 2 * $node_pad );
		$col_w[ $rank[ $node ] ] = max( $col_w[ $rank[ $node ] ], min( 220, ceil( $width ) ) );
	}
	$gap_w = array_fill( 0, max( 0, $columns - 1 ), $min_gap );
	foreach ( $edges as $id => $edge ) {
		$chain    = $edge['chain'];
		$last     = count( $chain ) - 2;
		$end_y    = function ( $i ) use ( $chain, $items, $y, $edge ) {
			return $y[ $chain[ $i ] ] + ( null === $items[ $chain[ $i ] ]['node'] ? 0 : $edge['offset'] );
		};
		$segments = array();
		for ( $i = 0; $i <= $last; $i++ ) {
			$ya    = $end_y( $i );
			$yb    = $end_y( $i + 1 );
			$align = 'middle';
			if ( 0 === $i && $fan_out[ $edge['tail'] ] > 1 ) {
				$align = 'start';
			} elseif ( $last === $i && $fan_in[ $edge['head'] ] > 1 ) {
				$align = 'end';
			}
			$segments[] = array(
				'rank'     => $items[ $chain[ $i ] ]['rank'],
				'ya'       => $ya,
				'yb'       => $yb,
				'align'    => $align,
				'straight' => abs( $ya - $yb ) < 1,
			);
		}
		$edges[ $id ]['segments'] = $segments;

		if ( '' === $edge['label'] ) {
			continue;
		}
		$lines                   = docspress_blocks_diagram_label_lines( $edge['label'] );
		$label_w                 = ceil( max( array_map( 'mb_strlen', $lines ) ) * $mono_char ) + 12;
		$edges[ $id ]['lines']   = $lines;
		$edges[ $id ]['label_w'] = $label_w;
		$edges[ $id ]['label_h'] = ( count( $lines ) * $line_h ) + 6;
		if ( count( $chain ) > 2 ) {
			// A long edge carries its label across the middle placeholder's column.
			$host                             = $chain[ (int) floor( count( $chain ) / 2 ) ];
			$edges[ $id ]['host']             = $host;
			$col_w[ $items[ $host ]['rank'] ] = max( $col_w[ $items[ $host ]['rank'] ], $label_w + ( 2 * $label_pad ) );
			continue;
		}
		$first = $segments[0];
		$need  = $label_w + ( 2 * $label_pad );
		if ( 'start' === $first['align'] ) {
			$need += $turn + $arrow;
		} elseif ( 'end' === $first['align'] ) {
			$need += $turn;
		} elseif ( $first['straight'] ) {
			$need += $arrow;
		} else {
			$need = max( $need, $turn + ( 2 * $arrow ) );
		}
		$gap_w[ $first['rank'] ] = max( $gap_w[ $first['rank'] ], $need );
	}

	$col_x = array( $pad );
	for ( $r = 1; $r < $columns; $r++ ) {
		$col_x[ $r ] = $col_x[ $r - 1 ] + $col_w[ $r - 1 ] + $gap_w[ $r - 1 ];
	}
	$width = $col_x[ $columns - 1 ] + $col_w[ $columns - 1 ] + $pad;

	$nodes = array();
	for ( $node = 0; $node < $count; $node++ ) {
		$nodes[] = array(
			'x'     => $col_x[ $rank[ $node ] ],
			'y'     => round( $y[ $node ] - ( $node_h / 2 ), 1 ),
			'w'     => $col_w[ $rank[ $node ] ],
			'h'     => $node_h,
			'label' => $actors[ $node ],
			'text'  => $names[ $node ],
		);
	}

	$paths  = array();
	$labels = array();
	$round  = static function ( $d ) {
		return preg_replace_callback(
			'/-?\d+\.\d+/',
			static function ( $number ) {
				return (string) round( (float) $number[0], 1 );
			},
			$d
		);
	};
	foreach ( $edges as $edge ) {
		$first = $edge['segments'][0];
		$d     = sprintf( 'M %s %s', $col_x[ $first['rank'] ] + $col_w[ $first['rank'] ], $first['ya'] );
		$slot  = null;
		foreach ( $edge['segments'] as $i => $segment ) {
			$xa = $col_x[ $segment['rank'] ] + $col_w[ $segment['rank'] ];
			$xb = $col_x[ $segment['rank'] + 1 ];
			$ya = $segment['ya'];
			$yb = $segment['yb'];
			if ( $segment['straight'] ) {
				$d .= sprintf( ' L %s %s', $xb, $yb );
			} elseif ( 'start' === $segment['align'] ) {
				$d .= sprintf( ' C %s %s, %s %s, %s %s L %s %s', $xa + ( $turn / 2 ), $ya, $xa + ( $turn / 2 ), $yb, $xa + $turn, $yb, $xb, $yb );
			} elseif ( 'end' === $segment['align'] ) {
				$d .= sprintf( ' L %s %s C %s %s, %s %s, %s %s', $xb - $turn, $ya, $xb - ( $turn / 2 ), $ya, $xb - ( $turn / 2 ), $yb, $xb, $yb );
			} else {
				$mid = ( $xa + $xb ) / 2;
				$d  .= sprintf( ' L %s %s C %s %s, %s %s, %s %s L %s %s', $mid - ( $turn / 2 ), $ya, $mid, $ya, $mid, $yb, $mid + ( $turn / 2 ), $yb, $xb, $yb );
			}
			// Where the label sits: the straight run, lined up with its siblings in a fan.
			if ( 'start' === $segment['align'] ) {
				$slot = array( ( $xa + $turn + $xb - $arrow ) / 2, $yb );
			} elseif ( 'end' === $segment['align'] ) {
				$slot = array( ( $xa + $xb - $turn ) / 2, $ya );
			} elseif ( $segment['straight'] ) {
				$slot = array( ( $xa + $xb - $arrow ) / 2, $ya );
			} else {
				$slot = array( ( $xa + $xb ) / 2, ( $ya + $yb ) / 2 );
			}
			$next = $edge['chain'][ $i + 1 ];
			if ( null === $items[ $next ]['node'] ) {
				$d .= sprintf( ' L %s %s', $xb + $col_w[ $segment['rank'] + 1 ], $yb );
			}
		}
		$paths[] = array(
			'd'        => $round( $d ),
			'reversed' => $edge['reversed'],
		);

		if ( empty( $edge['lines'] ) ) {
			continue;
		}
		if ( isset( $edge['host'] ) ) {
			$r    = $items[ $edge['host'] ]['rank'];
			$slot = array( $col_x[ $r ] + ( $col_w[ $r ] / 2 ), $y[ $edge['host'] ] );
			$key  = 'column-' . $r;
		} else {
			$key = 'gap-' . $first['rank'];
		}
		$labels[ $key ][] = array(
			'x'     => round( $slot[0], 1 ),
			'y'     => round( $slot[1], 1 ),
			'w'     => $edge['label_w'],
			'h'     => $edge['label_h'],
			'lines' => $edge['lines'],
		);
	}

	// Labels sharing a gap are nudged apart top to bottom so none covers another.
	$placed = array();
	foreach ( $labels as $stack ) {
		usort(
			$stack,
			static function ( $a, $b ) {
				return $a['y'] <=> $b['y'];
			}
		);
		foreach ( $stack as $i => $label ) {
			if ( $i > 0 ) {
				$floor       = $stack[ $i - 1 ]['y'] + ( ( $stack[ $i - 1 ]['h'] + $label['h'] ) / 2 ) + 4;
				$label['y']  = max( $label['y'], $floor );
				$stack[ $i ] = $label;
			}
			$placed[] = $label;
		}
	}

	// An actor that points at itself gets a loop over its top edge.
	$drawn_loops = array();
	foreach ( $loops as $loop ) {
		$node          = $nodes[ $loop['node'] ];
		$center        = $node['x'] + ( $node['w'] / 2 );
		$drawn_loops[] = $round( sprintf( 'M %s %s C %s %s, %s %s, %s %s', $center + 14, $node['y'], $center + 14, $node['y'] - 28, $center - 14, $node['y'] - 28, $center - 14, $node['y'] ) );
		if ( '' !== $loop['label'] ) {
			$lines    = docspress_blocks_diagram_label_lines( $loop['label'] );
			$placed[] = array(
				'x'     => $center,
				'y'     => $node['y'] - 21,
				'w'     => ceil( max( array_map( 'mb_strlen', $lines ) ) * $mono_char ) + 12,
				'h'     => ( count( $lines ) * $line_h ) + 6,
				'lines' => $lines,
			);
		}
	}
	foreach ( $placed as $label ) {
		$height = max( $height, $label['y'] + ( $label['h'] / 2 ) + $pad );
	}

	return array(
		'width'  => ceil( $width ),
		'height' => ceil( $height ),
		'nodes'  => $nodes,
		'edges'  => $paths,
		'labels' => $placed,
		'loops'  => $drawn_loops,
	);
}

/**
 * Render a flow diagram SVG.
 *
 * @param array  $diagram Parsed diagram.
 * @param string $marker_id Arrow marker ID.
 * @return string
 */
function docspress_blocks_render_flow_diagram( $diagram, $marker_id ) {
	$layout = docspress_blocks_layout_flow_diagram( $diagram );

	ob_start();
	?>
	<svg class="docspress-diagram__svg" viewBox="0 0 <?php echo esc_attr( (string) $layout['width'] ); ?> <?php echo esc_attr( (string) $layout['height'] ); ?>" width="<?php echo esc_attr( (string) $layout['width'] ); ?>" height="<?php echo esc_attr( (string) $layout['height'] ); ?>" style="min-width: <?php echo esc_attr( (string) min( 520, $layout['width'] ) ); ?>px" role="img" aria-hidden="true">
		<defs><marker id="<?php echo esc_attr( $marker_id ); ?>" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
		<g class="docspress-diagram__edges">
			<?php foreach ( $layout['edges'] as $edge ) : ?>
				<path d="<?php echo esc_attr( $edge['d'] ); ?>" <?php echo $edge['reversed'] ? 'marker-start' : 'marker-end'; ?>="url(#<?php echo esc_attr( $marker_id ); ?>)"/>
			<?php endforeach; ?>
			<?php foreach ( $layout['loops'] as $loop ) : ?>
				<path d="<?php echo esc_attr( $loop ); ?>" marker-end="url(#<?php echo esc_attr( $marker_id ); ?>)"/>
			<?php endforeach; ?>
		</g>
		<g class="docspress-diagram__labels">
			<?php foreach ( $layout['labels'] as $label ) : ?>
				<g transform="translate(<?php echo esc_attr( $label['x'] . ' ' . $label['y'] ); ?>)">
					<rect x="<?php echo esc_attr( (string) ( -$label['w'] / 2 ) ); ?>" y="<?php echo esc_attr( (string) ( -$label['h'] / 2 ) ); ?>" width="<?php echo esc_attr( (string) $label['w'] ); ?>" height="<?php echo esc_attr( (string) $label['h'] ); ?>" rx="4"/>
					<text text-anchor="middle">
						<?php foreach ( $label['lines'] as $line_index => $line ) : ?>
							<tspan x="0" y="<?php echo esc_attr( (string) ( ( $line_index - ( ( count( $label['lines'] ) - 1 ) / 2 ) ) * 12 + 3.5 ) ); ?>"><?php echo esc_html( $line ); ?></tspan>
						<?php endforeach; ?>
					</text>
				</g>
			<?php endforeach; ?>
		</g>
		<g class="docspress-diagram__nodes">
			<?php foreach ( $layout['nodes'] as $node ) : ?>
				<g transform="translate(<?php echo esc_attr( $node['x'] . ' ' . $node['y'] ); ?>)">
					<title><?php echo esc_html( $node['label'] ); ?></title>
					<rect width="<?php echo esc_attr( (string) $node['w'] ); ?>" height="<?php echo esc_attr( (string) $node['h'] ); ?>" rx="8"/>
					<text x="<?php echo esc_attr( (string) ( $node['w'] / 2 ) ); ?>" y="<?php echo esc_attr( (string) ( ( $node['h'] / 2 ) + 4 ) ); ?>" text-anchor="middle"><?php echo esc_html( $node['text'] ); ?></text>
				</g>
			<?php endforeach; ?>
		</g>
	</svg>
	<?php
	return trim( ob_get_clean() );
}

/**
 * Render a sequence diagram SVG.
 *
 * @param array  $diagram Parsed diagram.
 * @param string $marker_id Arrow marker ID.
 * @return string
 */
function docspress_blocks_render_sequence_diagram( $diagram, $marker_id ) {
	$count  = max( 1, count( $diagram['actors'] ) );
	$width  = max( 520, 120 + ( $count * 180 ) );
	$height = max( 260, 150 + ( count( $diagram['edges'] ) * 58 ) );
	$index  = array_flip( $diagram['actors'] );

	ob_start();
	?>
	<svg class="docspress-diagram__svg" viewBox="0 0 <?php echo esc_attr( (string) $width ); ?> <?php echo esc_attr( (string) $height ); ?>" width="<?php echo esc_attr( (string) $width ); ?>" height="<?php echo esc_attr( (string) $height ); ?>" style="min-width: 520px" role="img" aria-hidden="true">
		<defs><marker id="<?php echo esc_attr( $marker_id ); ?>" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
		<g class="docspress-diagram__lanes">
			<?php foreach ( $diagram['actors'] as $actor_index => $actor ) : ?>
				<?php $x = 100 + ( $actor_index * 180 ); ?>
				<line x1="<?php echo esc_attr( (string) $x ); ?>" y1="66" x2="<?php echo esc_attr( (string) $x ); ?>" y2="<?php echo esc_attr( (string) ( $height - 30 ) ); ?>"/>
				<g transform="translate(<?php echo esc_attr( (string) ( $x - 65 ) ); ?> 18)">
					<title><?php echo esc_html( $actor ); ?></title>
					<rect width="130" height="48" rx="8"/>
					<text x="65" y="29" text-anchor="middle"><?php echo esc_html( docspress_blocks_diagram_label( $actor ) ); ?></text>
				</g>
			<?php endforeach; ?>
		</g>
		<g class="docspress-diagram__messages">
			<?php foreach ( $diagram['edges'] as $message_index => $edge ) : ?>
				<?php
				$y  = 112 + ( $message_index * 58 );
				$x1 = 100 + ( $index[ $edge['from'] ] * 180 );
				$x2 = 100 + ( $index[ $edge['to'] ] * 180 );
				?>
				<line x1="<?php echo esc_attr( (string) $x1 ); ?>" y1="<?php echo esc_attr( (string) $y ); ?>" x2="<?php echo esc_attr( (string) $x2 ); ?>" y2="<?php echo esc_attr( (string) $y ); ?>" marker-end="url(#<?php echo esc_attr( $marker_id ); ?>)"/>
				<text x="<?php echo esc_attr( (string) ( ( $x1 + $x2 ) / 2 ) ); ?>" y="<?php echo esc_attr( (string) ( $y - 9 ) ); ?>" text-anchor="middle"><?php echo esc_html( docspress_blocks_diagram_label( $edge['label'] ? $edge['label'] : $edge['from'] . ' to ' . $edge['to'], 30 ) ); ?></text>
			<?php endforeach; ?>
		</g>
	</svg>
	<?php
	return trim( ob_get_clean() );
}

/**
 * Render the Diagram block.
 *
 * @param array $attributes Block attributes.
 * @return string
 */
function docspress_blocks_render_diagram( $attributes ) {
	$title       = isset( $attributes['title'] ) ? sanitize_text_field( $attributes['title'] ) : 'Publishing flow';
	$type        = docspress_blocks_allowed_value( isset( $attributes['type'] ) ? $attributes['type'] : '', array( 'flow', 'sequence' ), 'flow' );
	$source      = isset( $attributes['source'] ) ? (string) $attributes['source'] : '';
	$caption     = isset( $attributes['caption'] ) ? wp_kses_post( $attributes['caption'] ) : '';
	$diagram     = docspress_blocks_parse_diagram( $source );
	$marker_id   = wp_unique_id( 'docspress-diagram-arrow-' );
	$description = implode(
		'. ',
		array_map(
			static function ( $edge ) {
				return $edge['from'] . ' to ' . $edge['to'] . ( $edge['label'] ? ': ' . $edge['label'] : '' );
			},
			$diagram['edges']
		)
	);
	$wrapper     = get_block_wrapper_attributes( array( 'class' => 'docspress-diagram is-' . $type ) );

	ob_start();
	?>
	<figure <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<div class="docspress-diagram__header">
			<div>
				<span class="docspress-diagram__eyebrow"><?php echo esc_html( 'sequence' === $type ? __( 'Sequence', 'docspress-blocks' ) : __( 'Flow', 'docspress-blocks' ) ); ?></span>
				<h3><?php echo esc_html( $title ); ?></h3>
			</div>
			<span><?php echo esc_html( sprintf( _n( '%d relationship', '%d relationships', count( $diagram['edges'] ), 'docspress-blocks' ), count( $diagram['edges'] ) ) ); ?></span>
		</div>
		<div class="docspress-diagram__canvas" role="img" aria-label="<?php echo esc_attr( $title . '. ' . $description ); ?>">
			<?php
			echo 'sequence' === $type
				? docspress_blocks_render_sequence_diagram( $diagram, $marker_id ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				: docspress_blocks_render_flow_diagram( $diagram, $marker_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			?>
		</div>
		<?php if ( $caption ) : ?>
			<figcaption><?php echo $caption; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></figcaption>
		<?php endif; ?>
	</figure>
	<?php
	return trim( ob_get_clean() );
}

/**
 * Register the Diagram block.
 */
function docspress_blocks_register_diagram() {
	$block_url = DOCSPRESS_BLOCKS_URL . 'blocks/diagram/';

	wp_register_script( 'docspress-diagram-editor', $block_url . 'editor.js', array( 'wp-blocks', 'docspress-blocks-editor-shared' ), DOCSPRESS_BLOCKS_VERSION, true );
	wp_register_style( 'docspress-diagram', $block_url . 'style.css', array(), DOCSPRESS_BLOCKS_VERSION );
	wp_register_style( 'docspress-diagram-editor-style', $block_url . 'editor.css', array( 'wp-edit-blocks', 'docspress-diagram' ), DOCSPRESS_BLOCKS_VERSION );

	register_block_type(
		'docspress/diagram',
		array(
			'api_version'     => 3,
			'editor_script'   => 'docspress-diagram-editor',
			'style'           => 'docspress-diagram',
			'editor_style'    => 'docspress-diagram-editor-style',
			'render_callback' => 'docspress_blocks_render_diagram',
			'attributes'      => array(
				'title'   => array( 'type' => 'string', 'default' => 'Publishing flow' ),
				'type'    => array( 'type' => 'string', 'default' => 'flow' ),
				'source'  => array( 'type' => 'string', 'default' => "Markdown -> DocsPress: collect\nDocsPress -> WordPress: publish\nWordPress -> Reader: serve" ),
				'caption' => array( 'type' => 'string', 'default' => '' ),
			),
			'supports'        => docspress_blocks_design_supports( array( 'wide' ) ),
		)
	);
}
add_action( 'init', 'docspress_blocks_register_diagram', 10 );
