/* Copyright (c) 2020 vonKrafft <contact@vonkrafft.fr>
 * 
 * This file is part of VulnDB.
 * 
 * This file may be used under the terms of the GNU General Public License
 * version 3.0 as published by the Free Software Foundation and appearing in
 * the file LICENSE included in the packaging of this file. Please review the
 * following information to ensure the GNU General Public License version 3.0
 * requirements will be met: http://www.gnu.org/copyleft/gpl.html.
 * 
 * This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
 * WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 */

import React from 'react';
import { Link, Route, Redirect } from "react-router-dom";
import { Container, Message, Menu, Header, Grid, Icon, Loader, Input, Ref, List,
  Dropdown, Dimmer, Button, Popup, Label, Sticky } from 'semantic-ui-react'

import unified from 'unified'
import remarkParse from 'remark-parse'
import remarkAbbr from 'remark-abbr'
import remarkKbd from 'remark-kbd'
import remarkReact from 'remark-react'

import './App.css';
import _ from 'lodash';

export default function App() {
  const renderTplHomePage = (props) => ( <TplHomePage {...props} /> );
  return (
    <React.Fragment>
      <Route path="/" exact render={() => <Redirect to="/home/FR//" />} />
      <Route path="/home/:lang/:search?/:uuid?" render={renderTplHomePage} />
    </React.Fragment>
  );
}

/*****************************************************************************
 * TplHomePage
 *****************************************************************************/

class TplHomePage extends React.Component {
  state = {}

  constructor(props) {
    const { lang, uuid, search } = props.match.params;
    super(props);
    this.state = {
      loading: true,
      lang: lang || 'FR',
      uuid: uuid || null,
      search: decodeURIComponent(search || ''),
      data: [],
      total: 0,
      refs: [],
      templates: []
    };
    this.containerRef = React.createRef();
  }

  componentDidMount = () => {
    fetch('/api/templates')
      .then(response => { 
        if (response.status < 400) return response.json(); 
        else throw new Error(); 
      })
      .then(result => {
        const { lang, search, uuid } = this.state;
        this.setState({ 
          loading: false, 
          data: result.data, 
          total: result.data.length, 
          refs: _.reduce(result.data, (refs, tpl) => {
            refs[tpl.uuid] = React.createRef();
            return refs;
          }, {}),
          templates: this.filter(result.data, lang, search, uuid) 
        });
      })
      .catch(error => this.setState({ 
        loading: false, 
        error 
      }));
  }

  componentDidUpdate = () => {
    const { refs, uuid } = this.state;
    if (uuid !== null) {
      window.scrollTo({
        top: refs[uuid].current.offsetTop - 14,
        behavior: 'smooth'
      });
      this.setState({ uuid: null });
    }
  }

  filter = (data, lang, search) => {
    return _.sortBy(_.filter(data, (o) => {
      if (!search) return o.language === lang;
      return o.language === lang && o.owasp !== o.title && (
        o.title.toUpperCase().match(search.toUpperCase()) || 
        o.description.toUpperCase().match(search.toUpperCase()) || 
        o.consequences.toUpperCase().match(search.toUpperCase()) || 
        o.recommendations.toUpperCase().match(search.toUpperCase()) 
      );
    }), [
      (o) => parseInt(o.owasp.replace(/^A([0-9]+):.*$/i, '$1')),
      (o) => o.title
    ]);
  }

  handleSearchChange = (e, { name, value }) => {
    const { data, lang, search } = { ...this.state, [name]: value };
    this.setState({ loading: true });
    const templates = this.filter(data, lang, search);
    this.setState({ loading: false, templates: templates, [name]: value });
    this.props.history.push(`/home/${lang}/${encodeURIComponent(search)}/`);
  }

  handleSearchClear = () => {
    const { data, lang } = this.state;
    this.setState({ loading: true });
    const templates = this.filter(data, lang, '');
    this.setState({ loading: false, templates: templates, search: '' });
    this.props.history.push(`/home/${lang}//`);
  }

  handleTemplatePin = (uuid) => {
    const { refs, lang, search } = this.state;
    this.props.history.push(`/home/${lang}/${encodeURIComponent(search)}/${uuid}`);
    window.scrollTo({
      top: refs[uuid].current.offsetTop - 14,
      behavior: 'smooth'
    });
  }

  handleImportClick = (e) => {}
  handleSatisticsClick = (e) => {}
  handleAddClick = (e) => {}

  render = () => {
    const { loading, templates, refs, total, search, lang } = this.state;

    return (
      <React.Fragment>
        <TplNavbar 
          onImport={this.handleImportClick} 
          onSatistics={this.handleSatisticsClick} 
          onAdd={this.handleAddClick} 
        />
        <Container className='wrapper'>
          <Ref innerRef={this.containerRef}>
            <Grid>
              <Grid.Column width={4}>
                <Sticky context={this.containerRef} offset={71.2333}>
                  <Dimmer active={loading} inverted></Dimmer>
                  <TplSearchInput 
                    search={search} 
                    lang={lang} 
                    onChange={this.handleSearchChange} 
                    onClear={this.handleSearchClear} 
                  />
                  <TplSidebarMenu 
                    templates={templates} 
                    total={total} 
                    onClick={this.handleTemplatePin} 
                    key={`Sidebar-${lang}-${search}`}
                  />
                </Sticky>
              </Grid.Column>
              <Grid.Column width={12}>
                <Dimmer active={loading} inverted>
                  <Loader />
                </Dimmer>
                <TplList 
                  templates={templates} 
                  refs={refs} 
                  search={search} 
                  onPin={this.handleTemplatePin}
                />
                <TplFooter />
              </Grid.Column>
            </Grid>
          </Ref>
        </Container>
      </React.Fragment>
    );
  }
}

/*****************************************************************************
 * TplList
 *****************************************************************************/
 
const TplList = (props) => {
  const { templates, refs, search, onPin, onEdit } = props;

  const TplListItem = ({ tpl, refs }) => (
    <div
      key={tpl.uuid} 
      ref={refs[tpl.uuid]} 
      class='ui mini segment' 
      data-header={tpl.owasp === tpl.title}
    >
      <TplListHeader tpl={tpl} onPin={onPin} onEdit={onEdit} />
      <TplListContent md={tpl.description} />
      <TplListContent md={tpl.consequences} />
      <TplListContent md={tpl.recommendations} />
    </div>
  );

  const TplListHeader= ({ tpl, onPin, onEdit }) => {    
    return (
      <Header>
        {tpl.title}
        <Label basic as='a' size='mini' content='Edit' icon='edit outline' />
        <Popup
          trigger={<Label 
            as='a' 
            basic 
            size='mini' 
            icon='pin' 
            empty 
            onClick={() => onPin(tpl.uuid)}
          />}
          size='mini' 
          content='Pin the template to share it'
          position='bottom right'
        />
        <Header.Subheader>
          {tpl.owasp}
        </Header.Subheader>
      </Header>
    );
  };

  const TplListContent = ({ md }) => {
    if (search) md = md.replace(new RegExp('(' + search + ')', 'i'), '||$1||');
    md += '\n' + _.join(_.map(md.match(/\b(([A-Z])\2\2)\b/g), (m) => {
      return '*[' + m + ']: need to be replaced';
    }), '\n');
    
    return (
      <p class='paragraph'>{
        unified()
          .use(remarkParse)
          .use(remarkAbbr)
          .use(remarkKbd)
          .use(remarkReact)
          .processSync(md).result
      }</p>
    );
  };

  return (
    <React.Fragment>
      { _.map(templates, (tpl) => (
        <TplListItem tpl={tpl} refs={refs} />
      )) }
    </React.Fragment>
  );
}

/*****************************************************************************
 * TplNavbar
 *****************************************************************************/

const TplNavbar = (props) => {
  const { onImport, onSatistics, onAdd } = props;

  return (
    <Menu pointing secondary inverted size='huge' className='navbar'>
      <Container>
        <Menu.Item header><Link to='/'>VulnDB</Link></Menu.Item>
        <Menu.Menu icon position='right'>
          <Menu.Item href='/api/export' target='_blank'>
            <Icon name='download' />
          </Menu.Item>
          <Menu.Item onClick={onImport}>
            <Icon name='upload' />
          </Menu.Item>
          <Menu.Item onClick={onSatistics}>
            <Icon name='line graph' />
          </Menu.Item>
          <Menu.Item onClick={onAdd}>
            <Icon name='add square' />
          </Menu.Item>
        </Menu.Menu>
      </Container>
    </Menu>
  );
}

/*****************************************************************************
 * TplSearchInput
 *****************************************************************************/

const TplSearchInput = (props) => {
  const { search, lang, onChange, onClear } = props;

  const options = [
    { key: 'FR', text: 'FR', value: 'FR' },
    { key: 'EN', text: 'EN', value: 'EN' },
  ];

  return (
    <Input 
      fluid 
      placeholder='Search...' 
      name='search'
      value={search}
      onChange={onChange}
      label={<Dropdown 
        basic 
        name='lang' 
        value={lang || 'FR'} 
        options={options} 
        onChange={onChange}
      />}
      labelPosition='left' 
      icon={<Icon 
        link 
        name='close' 
        disabled={!search} 
        onClick={onClear} 
      />} 
    />
  );
}

/*****************************************************************************
 * TplSidebarMenu
 *****************************************************************************/

const TplSidebarMenu = (props) => {
  const { templates, total, onClick } = props;

  const sidebar =  _(templates).sortBy([
    (o) => parseInt(o.owasp.replace(/^A([0-9]+):.*$/i, '$1')),
    (o) => o.title
  ]).reduce((menu, tpl) => {
    if (! menu[tpl.owasp]) {
      menu[tpl.owasp] = { 
        category: tpl.owasp, 
        templates: [] 
      };
    }
    if (tpl.owasp !== tpl.title) {
      menu[tpl.owasp].templates.push(tpl);
    }
    return menu;
  }, {});

  return (
    <Menu vertical>
      <Menu.Item>
        <Message size='mini'>
          {templates.length} / {total} templates shown
        </Message>
      </Menu.Item>
      { _.map(sidebar || [], (menu) => (
        <Menu.Item>
          <Menu.Header>{menu.category}</Menu.Header>
          <Menu.Menu>
            { _.map(menu.templates, (tpl) => (
              <Menu.Item
                key={tpl.uuid}
                name={tpl.title}
                onClick={() => onClick(tpl.uuid)}
              />
            )) }
          </Menu.Menu>
        </Menu.Item>
      )) }
    </Menu>
  );
}

/*****************************************************************************
 * TplFooter
 *****************************************************************************/

const TplFooter = (props) => {
  return (
    <List floated='right' horizontal size='mini'>
      <List.Item disabled href='#'>
        Templates for pentest reports &ndash; <em>Kraffted</em> with &lt;3
      </List.Item>
      <List.Item href='//github.com/vonKrafft/VulnDB-Docker' target='_blank'>
        <Icon name='github' /> Source code
      </List.Item>
      <List.Item disabled href='#'>
        v3.0.0
      </List.Item>
    </List>
  );
}